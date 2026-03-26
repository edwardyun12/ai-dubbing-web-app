'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const isVideo = file.type.startsWith('video/');
    const media = isVideo ? document.createElement('video') : document.createElement('audio');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(media.src);
      resolve(media.duration);
    };
    media.onerror = () => {
      URL.revokeObjectURL(media.src);
      resolve(Infinity);
    };
    media.src = URL.createObjectURL(file);
  });
};

export default function DubbingPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('en');
  const [voiceId, setVoiceId] = useState('CwhRBWXzGAHq8TQ4Fs17');
  const [saveMode, setSaveMode] = useState<'mp4' | 'mp3'>('mp4');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, [resultUrl]);

  const loadFFmpeg = async () => {
    if (ffmpegLoadedRef.current && ffmpegRef.current) return;
    if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg();
    const ffmpeg = ffmpegRef.current;
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    setProgress("엔진 로드 중...");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoadedRef.current = true;
  };

  const compressAndCrop = async (ffmpeg: FFmpeg, inputName: string): Promise<Blob> => {
    const outputName = `optimized.mp4`;
    setProgress("압축 및 60초 크롭 중...");
    const result = await ffmpeg.exec([
      '-i', inputName, '-t', '60', '-vf', 'scale=480:-2',
      '-c:v', 'libx264', '-crf', '32', '-b:v', '400k',
      '-c:a', 'aac', '-b:a', '64k', '-preset', 'ultrafast', outputName,
    ]);
    if (result === 0) {
      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      await ffmpeg.deleteFile(outputName);
      return new Blob([data as any], { type: 'video/mp4' }); // as any로 빌드 에러 방지
    }
    throw new Error("전처리 실패");
  };

  const base64ToBlob = (b64: string) => {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) { bytes[i] = binStr.charCodeAt(i); }
    return new Blob([bytes], { type: 'audio/mpeg' });
  };

  const handleSubmit = async () => {
    if (!file) return alert("파일을 선택해주세요!");
    setLoading(true);
    setResultUrl(null);

    try {
      const duration = await getMediaDuration(file);
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;
      
      let processedFile: File | Blob = file;
      await ffmpeg.writeFile('raw_input', await fetchFile(file));

      if (duration > 60 || file.size > 4 * 1024 * 1024) {
        processedFile = await compressAndCrop(ffmpeg, 'raw_input');
      }

      setProgress("AI 음성 생성 중...");
      const formData = new FormData();
      formData.append('file', processedFile, `media.mp4`);
      formData.append('targetLang', targetLang);
      formData.append('voiceId', voiceId);

      const res = await fetch('/api/dub', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("API 요청 실패 (용량 초과 가능성)");

      const { chunks } = await res.json();
      setProgress("묵음 제거 및 순차 합성 중...");

      // 묵음 제거의 핵심: adelay를 빼고 concat으로 음성을 이어 붙임
      const filterInputs: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const name = `c${i}.mp3`;
        await ffmpeg.writeFile(name, await fetchFile(base64ToBlob(chunks[i].audioBase64)));
        filterInputs.push(`-i`, name);
      }

      const outputName = saveMode === 'mp4' ? 'out.mp4' : 'out.mp3';
      
      // 모든 음성 청크를 하나로 합치는 필터 (concat)
      const concatFilter = chunks.map((_, i) => `[${saveMode === 'mp4' ? i + 1 : i}:a]`).join('') + `concat=n=${chunks.length}:v=0:a=1[aout]`;

      if (saveMode === 'mp4') {
        await ffmpeg.writeFile('vid', await fetchFile(processedFile));
        await ffmpeg.exec(['-i', 'vid', ...filterInputs, '-filter_complex', concatFilter, '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-shortest', outputName]);
      } else {
        await ffmpeg.exec([...filterInputs, '-filter_complex', concatFilter, '-map', '[aout]', outputName]);
      }

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      const finalBlob = new Blob([data as any], { type: saveMode === 'mp4' ? 'video/mp4' : 'audio/mpeg' });
      setResultUrl(URL.createObjectURL(finalBlob));

      // 정리
      await ffmpeg.deleteFile('raw_input');
      if (saveMode === 'mp4') await ffmpeg.deleteFile('vid');
      for (let i = 0; i < chunks.length; i++) await ffmpeg.deleteFile(`c${i}.mp3`);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <main className="min-h-screen bg-white p-6 md:p-12 flex flex-col items-center text-black">
      <div className="w-full max-w-lg mb-12 flex justify-between items-center">
        <h2 className="text-xl font-black tracking-tighter">VOICE DUB</h2>
        {session && (
          <button onClick={() => signOut()} className="text-xs font-bold border-b border-black">LOGOUT</button>
        )}
      </div>

      <div className="w-full max-w-lg space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-black leading-tight tracking-tighter uppercase">AI Video <br /> Dubbing</h1>
          <p className="text-sm text-gray-600 font-bold">공백 없이 목소리만 이어 붙이는 모드 활성화</p>
        </header>

        {!session ? (
          <button onClick={() => signIn('google')} className="w-full py-4 bg-black text-white font-bold rounded-full">GOOGLE LOGIN</button>
        ) : (
          <div className="space-y-10">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">01. File Upload</label>
              <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border-2 border-black p-4 rounded-2xl text-xs font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest">02. Format</label>
                <select value={saveMode} onChange={(e) => setSaveMode(e.target.value as any)} className="w-full border-2 border-black p-3 rounded-xl font-bold text-sm">
                  <option value="mp4">MP4 Video</option>
                  <option value="mp3">MP3 Audio</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest">03. Language</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full border-2 border-black p-3 rounded-xl font-bold text-sm">
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} className={`w-full py-5 rounded-full font-black text-sm transition-all ${loading ? 'bg-gray-100 text-gray-400' : 'bg-black text-white shadow-xl hover:scale-105'}`}>
              {loading ? progress.toUpperCase() : 'GENERATE DUBBING'}
            </button>

            {resultUrl && (
              <div className="mt-16 pt-12 border-t-2 border-black text-center space-y-6">
                <div className="overflow-hidden rounded-2xl border-2 border-black">
                  {saveMode === 'mp4' ? <video src={resultUrl} controls className="w-full" /> : <audio src={resultUrl} controls className="w-full p-8" />}
                </div>
                <a href={resultUrl} download={`result.${saveMode}`} className="inline-block text-xs font-black border-b-2 border-black pb-1 uppercase">Download File</a>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="mt-24 text-[10px] font-bold text-gray-300 uppercase tracking-widest">© 2026 AI Dubbing Lab</footer>
    </main>
  );
}
