'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// 미디어 재생 시간 확인용 유틸리티
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
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  // FFmpeg 엔진 로드
  const loadFFmpeg = async () => {
    if (ffmpegLoadedRef.current && ffmpegRef.current) return;
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    setProgress("엔진 로드 중...");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoadedRef.current = true;
  };

  // 60초 크롭 및 고압축 처리 (SharedArrayBuffer 타입 에러 수정 완료)
  const compressAndCrop = async (
    ffmpeg: FFmpeg,
    inputName: string
  ): Promise<Blob> => {
    const outputName = `optimized.mp4`;
    setProgress("60초 크롭 및 고압축 중...");

    const result = await ffmpeg.exec([
      '-i', inputName,
      '-t', '60',              // 최대 60초
      '-vf', 'scale=480:-2',   // 해상도 축소
      '-c:v', 'libx264',
      '-crf', '30',            // 압축률
      '-b:v', '500k',          // 비트레이트 제한
      '-c:a', 'aac',
      '-b:a', '64k',
      '-preset', 'ultrafast',
      outputName,
    ]);

    if (result === 0) {
      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      await ffmpeg.deleteFile(outputName);
      // [중요] data.buffer 대신 data(Uint8Array)를 직접 전달하여 타입 에러 해결
      return new Blob([data], { type: 'video/mp4' });
    }

    throw new Error("영상 전처리 실패");
  };

  const base64ToBlob = (b64: string, type = 'audio/mpeg') => {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const handleSubmit = async () => {
    if (!file) return alert("파일을 선택해주세요!");
    setLoading(true);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

    try {
      setProgress("미디어 분석 중...");
      const duration = await getMediaDuration(file);
      
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;
      
      let processedFile: File | Blob = file;
      const inputName = 'raw_input';
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // 60초 초과이거나 4MB 초과면 압축/크롭 처리
      if (duration > 60 || file.size > 4 * 1024 * 1024) {
        processedFile = await compressAndCrop(ffmpeg, inputName);
      }

      setProgress("AI 음성 생성 중...");
      const formData = new FormData();
      formData.append('file', processedFile, `media.mp4`);
      formData.append('targetLang', targetLang);
      formData.append('voiceId', voiceId);

      const res = await fetch('/api/dub', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "더빙 API 요청 실패");
      }

      const resData = await res.json();
      const chunks = resData.chunks as { audioBase64: string, start: number }[];

      setProgress("최종 타임라인 합성 중...");
      await ffmpeg.writeFile('vid', await fetchFile(processedFile));
      
      const inputs = ['-i', 'vid'];
      let filterComplex = '';
      const aOuts: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkName = `chunk_${i}.mp3`;
        await ffmpeg.writeFile(chunkName, await fetchFile(base64ToBlob(chunks[i].audioBase64)));
        inputs.push('-i', chunkName);
        const delayMs = Math.round(chunks[i].start * 1000);
        filterComplex += `[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
        aOuts.push(`[a${i}]`);
      }

      const outputName = saveMode === 'mp4' ? 'out.mp4' : 'out.mp3';
      
      if (chunks.length > 1) {
        filterComplex += `${aOuts.join('')}amix=inputs=${chunks.length}:normalize=0[aout]`;
        const args = saveMode === 'mp4' 
          ? [...inputs, '-filter_complex', filterComplex, '-c:v', 'copy', '-map', '0:v:0', '-map', '[aout]', outputName]
          : [...inputs, '-filter_complex', filterComplex, '-map', '[aout]', outputName];
        await ffmpeg.exec(args);
      } else {
        filterComplex = filterComplex.slice(0, -1);
        const args = saveMode === 'mp4'
          ? [...inputs, '-filter_complex', filterComplex, '-c:v', 'copy', '-map', '0:v:0', '-map', '[a0]', outputName]
          : [...inputs, '-filter_complex', filterComplex, '-map', '[a0]', outputName];
        await ffmpeg.exec(args);
      }

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      
      // [중요] 여기서도 data.buffer 대신 data를 사용하여 타입 에러 방지
      const finalBlob = new Blob([data], { 
        type: saveMode === 'mp4' ? 'video/mp4' : 'audio/mpeg' 
      });
      setResultUrl(URL.createObjectURL(finalBlob));

      // 파일 정리
      await ffmpeg.deleteFile('vid');
      await ffmpeg.deleteFile('raw_input');
      for (let i = 0; i < chunks.length; i++) {
        await ffmpeg.deleteFile(`chunk_${i}.mp3`).catch(() => {});
      }
      await ffmpeg.deleteFile(outputName).catch(() => {});

    } catch (error) {
      alert(error instanceof Error ? error.message : "알 수 없는 에러가 발생했습니다.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `dubbed_result.${saveMode}`;
    a.click();
  };

  return (
    <main className="min-h-screen bg-white p-6 md:p-12 flex flex-col items-center text-black">
      <div className="w-full max-w-lg mb-12 flex justify-between items-center">
        <h2 className="text-xl font-black tracking-tighter">VOICE DUB</h2>
        {session && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">{session.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs font-bold border-b border-black pb-0.5">LOGOUT</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-black leading-tight tracking-tighter uppercase">AI Video <br /> Dubbing Service</h1>
          <p className="text-sm font-medium text-gray-600">60초 자동 크롭 및 Vercel 4.5MB 제한 최적화 버전</p>
        </header>

        {!session ? (
          <button onClick={() => signIn('google')} className="w-full py-4 bg-black text-white font-bold rounded-full flex items-center justify-center gap-3">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" className="w-5 h-5 invert" />
            GOOGLE LOGIN
          </button>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">01. File Upload</label>
              <div className="border-2 border-black p-6 rounded-2xl">
                <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm font-bold cursor-pointer" />
                <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">* 1분 초과 시 자동 크롭</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest">02. Format</label>
                <div className="flex gap-2">
                  {(['mp4', 'mp3'] as const).map((mode) => (
                    <button key={mode} onClick={() => setSaveMode(mode)} className={`flex-1 py-3 rounded-xl border-2 font-black text-xs transition-all ${saveMode === mode ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'}`}>
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest">03. Language</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full border-2 border-black rounded-xl p-3 text-sm font-bold outline-none bg-white appearance-none cursor-pointer">
                  <option value="ko">한국어 (Korean)</option>
                  <option value="en">영어 (English)</option>
                  <option value="ja">일본어 (Japanese)</option>
                  <option value="zh-CN">중국어 (Chinese)</option>
                  <option value="es">스페인어 (Spanish)</option>
                  <option value="fr">프랑스어 (French)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">04. Voice Type</label>
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="w-full border-2 border-black rounded-xl p-3 text-sm font-bold outline-none bg-white cursor-pointer">
                <option value="CwhRBWXzGAHq8TQ4Fs17">Roger (남성 - 기본)</option>
                <option value="Xb7hH8MSUJpSbSDYk0k2">Alice (여성 - 활기찬)</option>
                <option value="IKne3meq5aSn9XLyUdCD">Charlie (남성 - 차분한)</option>
                <option value="JBFqnCBsd6RMkjVDRZzb">George (남성 - 따뜻한)</option>
              </select>
            </div>

            <button onClick={handleSubmit} disabled={loading} className={`w-full py-5 rounded-full font-black text-sm tracking-widest transition-all shadow-xl ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:scale-[1.02] active:scale-95'}`}>
              {loading ? progress.toUpperCase() : 'GENERATE DUBBING'}
            </button>

            {resultUrl && (
              <div className="mt-16 pt-12 border-t-2 border-black text-center space-y-6 animate-in zoom-in duration-500">
                <span className="inline-block px-4 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">Success</span>
                <div className="overflow-hidden rounded-2xl border-2 border-black bg-gray-50 shadow-2xl">
                  {saveMode === 'mp4' ? <video src={resultUrl} controls className="w-full" /> : <audio src={resultUrl} controls className="w-full p-8" />}
                </div>
                <button onClick={handleDownload} className="text-xs font-black border-b-2 border-black pb-1 uppercase tracking-tighter">Download {saveMode} File</button>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="mt-24 text-[10px] font-bold text-gray-300 uppercase tracking-widest">© 2026 AI Dubbing Lab</footer>
    </main>
  );
}
