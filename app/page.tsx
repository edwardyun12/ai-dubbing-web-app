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
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

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

  // 60초 크롭 + 해상도/비트레이트 압축으로 반드시 4MB 이하로 만들기
  const compressAndCrop = async (
    ffmpeg: FFmpeg,
    inputName: string,
    ext: string,
    originalFile: File | Blob
  ): Promise<Blob> => {
    const outputName = `cropped.mp4`;
    setProgress("영상 압축 및 크롭 중...");

    const result = await ffmpeg.exec([
      '-i', inputName,
      '-t', '60',              // 최대 60초
      '-vf', 'scale=640:-2',   // 가로 640px로 축소
      '-c:v', 'libx264',
      '-crf', '28',            // 화질 압축 (값 높을수록 더 압축)
      '-c:a', 'aac',
      '-b:a', '64k',           // 오디오 비트레이트 축소
      '-preset', 'ultrafast',
      outputName,
    ]);

    if (result === 0) {
      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      await ffmpeg.deleteFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' });

      // 그래도 4MB 초과면 화질을 더 낮춰서 재시도
      if (blob.size > 4 * 1024 * 1024) {
        setProgress("추가 압축 중...");
        const outputName2 = `cropped2.mp4`;
        await ffmpeg.writeFile('retry_input.mp4', await fetchFile(blob));
        const result2 = await ffmpeg.exec([
          '-i', 'retry_input.mp4',
          '-vf', 'scale=480:-2',  // 더 작게
          '-c:v', 'libx264',
          '-crf', '32',           // 더 압축
          '-c:a', 'aac',
          '-b:a', '48k',
          '-preset', 'ultrafast',
          outputName2,
        ]);
        if (result2 === 0) {
          const data2 = await ffmpeg.readFile(outputName2) as Uint8Array;
          await ffmpeg.deleteFile(outputName2);
          await ffmpeg.deleteFile('retry_input.mp4');
          return new Blob([data2.buffer as ArrayBuffer], { type: 'video/mp4' });
        }
      }

      return blob;
    }

    // FFmpeg 실패 시 원본 반환
    console.warn("압축 실패 → 원본 반환");
    return originalFile instanceof File
      ? new Blob([await originalFile.arrayBuffer()], { type: originalFile.type })
      : originalFile as Blob;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `dubbed_result.${saveMode}`;
    a.click();
  };

  const handleSubmit = async () => {
    if (!file) return alert("파일을 선택해주세요!");
    setLoading(true);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

    try {
      setProgress("미디어 길이 확인 중...");
      const duration = await getMediaDuration(file);
      const ext = (file.name.includes('.')
        ? file.name.split('.').pop()?.toLowerCase()
        : undefined) ?? 'mp4';

      let processedFile: File | Blob = file;

      // 60초 초과이거나 4MB 초과면 압축 처리
      const needsProcessing = duration > 60 || file.size > 4 * 1024 * 1024;

      if (needsProcessing) {
        setProgress("파일 준비 중...");
        await loadFFmpeg();
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) throw new Error("FFmpeg 로드 실패");

        const inputName = `input_${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'media'}`;
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        processedFile = await compressAndCrop(ffmpeg, inputName, ext, file);

        await ffmpeg.deleteFile(inputName);
      }

      setProgress("AI 음성 생성 중...");
      const formData = new FormData();
      formData.append('file', processedFile, `media.mp4`);
      formData.append('targetLang', targetLang);
      formData.append('voiceId', voiceId);

      const res = await fetch('/api/dub', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "더빙 생성 실패");
      }

      const resData = await res.json();
      if (!resData.chunks || resData.chunks.length === 0) {
        throw new Error("처리된 음성 데이터가 없습니다.");
      }

      const chunks = resData.chunks as { audioBase64: string, start: number }[];

      const base64ToBlob = (b64: string, type = 'audio/mpeg') => {
        const binStr = atob(b64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        return new Blob([bytes], { type });
      };

      if (saveMode === 'mp4' && file.type.startsWith('video/')) {
        setProgress("비디오 타임라인 동기화 및 합성 중...");
        await loadFFmpeg();
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) throw new Error("FFmpeg 로드 실패");

        await ffmpeg.writeFile('vid', await fetchFile(processedFile));
        const inputs = ['-i', 'vid'];
        let filterComplex = '';
        const aOuts: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunkBlob = base64ToBlob(chunks[i].audioBase64);
          const chunkName = `chunk_${i}.mp3`;
          await ffmpeg.writeFile(chunkName, await fetchFile(chunkBlob));
          inputs.push('-i', chunkName);
          const delayMs = Math.round(chunks[i].start * 1000);
          filterComplex += `[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
          aOuts.push(`[a${i}]`);
        }

        if (chunks.length > 1) {
          filterComplex += `${aOuts.join('')}amix=inputs=${chunks.length}:normalize=0[aout]`;
          await ffmpeg.exec([...inputs, '-filter_complex', filterComplex, '-c:v', 'copy', '-map', '0:v:0', '-map', '[aout]', 'out.mp4']);
        } else {
          filterComplex = filterComplex.slice(0, -1);
          await ffmpeg.exec([...inputs, '-filter_complex', filterComplex, '-c:v', 'copy', '-map', '0:v:0', '-map', '[a0]', 'out.mp4']);
        }

        const data = await ffmpeg.readFile('out.mp4') as Uint8Array;
        setResultUrl(URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })));

        const cleanupFiles = ['vid', ...aOuts.map((_, i) => `chunk_${i}.mp3`), 'out.mp4'];
        for (const fname of cleanupFiles) { await ffmpeg.deleteFile(fname).catch(() => {}); }

      } else {
        setProgress("오디오 타임라인 합성 중...");
        await loadFFmpeg();
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) throw new Error("FFmpeg 로드 실패");

        const inputs: string[] = [];
        let filterComplex = '';
        const aOuts: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunkBlob = base64ToBlob(chunks[i].audioBase64);
          const chunkName = `chunk_${i}.mp3`;
          await ffmpeg.writeFile(chunkName, await fetchFile(chunkBlob));
          inputs.push('-i', chunkName);
          const delayMs = Math.round(chunks[i].start * 1000);
          filterComplex += `[${i}:a]adelay=${delayMs}|${delayMs}[a${i}];`;
          aOuts.push(`[a${i}]`);
        }

        if (chunks.length > 1) {
          filterComplex += `${aOuts.join('')}amix=inputs=${chunks.length}:normalize=0[aout]`;
          await ffmpeg.exec([...inputs, '-filter_complex', filterComplex, '-map', '[aout]', 'out.mp3']);
        } else {
          filterComplex = filterComplex.slice(0, -1);
          await ffmpeg.exec([...inputs, '-filter_complex', filterComplex, '-map', '[a0]', 'out.mp3']);
        }

        const data = await ffmpeg.readFile('out.mp3') as Uint8Array;
        setResultUrl(URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'audio/mpeg' })));

        const cleanupFiles = [...aOuts.map((_, i) => `chunk_${i}.mp3`), 'out.mp3'];
        for (const fname of cleanupFiles) { await ffmpeg.deleteFile(fname).catch(() => {}); }
      }

    } catch (error) {
      alert(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
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
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="text-xs font-bold border-b border-black pb-0.5 hover:text-gray-500 hover:border-gray-500 transition-all"
            >
              LOGOUT
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl font-black leading-tight tracking-tighter uppercase">
            AI Video <br /> Dubbing Service
          </h1>
          <p className="text-sm font-medium leading-relaxed text-gray-600 max-w-sm">
            영상이나 음성 파일을 업로드하면 AI가 자연스러운 목소리로 더빙해 드립니다.
            모든 합성은 브라우저에서 안전하게 처리됩니다.
          </p>
        </header>

        {!session ? (
          <div className="pt-8">
            <button
              onClick={() => signIn('google')}
              className="w-full py-4 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" className="w-5 h-5 invert" />
              GOOGLE LOGIN
            </button>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">01. File Upload</label>
              <div className="border-2 border-black p-6 rounded-2xl">
                <input
                  type="file"
                  accept="video/*,audio/*"
                  onChange={handleFileChange}
                  className="w-full text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white file:text-xs file:font-bold hover:file:bg-gray-800 cursor-pointer"
                />
                <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                  * 파일 크기 무관 · 1분 초과 시 자동 크롭 · 자동 압축 처리
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">02. Save Format</label>
              <div className="flex gap-2">
                {(['mp4', 'mp3'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSaveMode(mode)}
                    className={`flex-1 py-3 rounded-xl border-2 font-black text-xs transition-all ${
                      saveMode === mode ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'
                    }`}
                  >
                    {mode.toUpperCase()} {mode === 'mp4' ? 'VIDEO' : 'AUDIO'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">03. Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full border-2 border-black rounded-xl p-3 text-sm font-bold outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="ko">한국어 (Korean)</option>
                <option value="en">영어 (English)</option>
                <option value="ja">일본어 (Japanese)</option>
                <option value="zh-CN">중국어 (Chinese Simplified)</option>
                <option value="es">스페인어 (Spanish)</option>
                <option value="fr">프랑스어 (French)</option>
                <option value="de">독일어 (German)</option>
                <option value="it">이탈리아어 (Italian)</option>
                <option value="pt">포르투갈어 (Portuguese)</option>
                <option value="ru">러시아어 (Russian)</option>
                <option value="vi">베트남어 (Vietnamese)</option>
                <option value="th">태국어 (Thai)</option>
                <option value="id">인도네시아어 (Indonesian)</option>
                <option value="hi">힌디어 (Hindi)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">04. Voice Type</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full border-2 border-black rounded-xl p-3 text-sm font-bold outline-none bg-white appearance-none cursor-pointer focus:ring-2 focus:ring-black"
              >
                <option value="CwhRBWXzGAHq8TQ4Fs17">Roger (남성 - 신뢰감 있는 기본 음성)</option>
                <option value="FGY2WhTYpPnrIDTdsKH5">Lara (여성 - 활기찬)</option>
                <option value="IKne3meq5aSn9XLyUdCD">Charlie (남성 - 차분한)</option>
                <option value="JBFqnCBsd6RMkjVDRZzb">George (남성 - 따뜻한)</option>
                <option value="Xb7hH8MSUJpSbSDYk0k2">Alice (여성 - 에너지 있고 활기찬)</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Sarah (여성 - 부드러운)</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-5 rounded-full font-black text-sm tracking-widest transition-all shadow-xl ${
                loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {loading ? progress.toUpperCase() : 'GENERATE DUBBING'}
            </button>

            {resultUrl && (
              <div className="mt-16 pt-12 border-t-2 border-black text-center space-y-6 animate-in zoom-in duration-500">
                <span className="inline-block px-4 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Success
                </span>
                <div className="overflow-hidden rounded-2xl border-2 border-black bg-gray-50 shadow-2xl">
                  {saveMode === 'mp4' && file?.type.startsWith('video/') ? (
                    <video src={resultUrl} controls className="w-full" />
                  ) : (
                    <div className="p-8">
                      <audio src={resultUrl} controls className="w-full" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 text-xs font-black border-b-2 border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all uppercase tracking-tighter"
                >
                  Download {saveMode} File
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-24 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
        &copy; 2026 AI Dubbing Lab. All rights reserved.
      </footer>
    </main>
  );
}
