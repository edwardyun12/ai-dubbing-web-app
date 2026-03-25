'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ffmpegRef.current = new FFmpeg();
    }
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || ffmpeg.loaded) return;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    setProgress("엔진 로드 중...");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  };

  const handleSubmit = async () => {
    if (!file) return alert("파일을 선택해주세요!");
    
    setLoading(true);
    setProgress("AI 음성 생성 중...");
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLang', targetLang);
    formData.append('voiceId', voiceId);

    try {
      const res = await fetch('/api/dub', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("더빙 생성 실패");
      
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (saveMode === 'mp4' && file.type.startsWith('video/')) {
        setProgress("비디오 합성 중...");
        await loadFFmpeg();
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) return;

        await ffmpeg.writeFile('vid', await fetchFile(file));
        await ffmpeg.writeFile('aud', await fetchFile(audioBlob));

        await ffmpeg.exec([
          '-i', 'vid', '-i', 'aud',
          '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0',
          '-shortest', 'out.mp4'
        ]);

        const data = await ffmpeg.readFile('out.mp4') as Uint8Array;
        const finalVideoBlob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' });
        setResultUrl(URL.createObjectURL(finalVideoBlob));
      } else {
        setResultUrl(audioUrl);
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
      {/* 상단 네비게이션 */}
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
            {/* 1. 파일 섹션 */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest">01. File Upload</label>
              <div className="border-2 border-black p-6 rounded-2xl">
                <input 
                  type="file" 
                  accept="video/*,audio/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="w-full text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white file:text-xs file:font-bold hover:file:bg-gray-800 cursor-pointer" 
                />
                <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                  * MAX 4MB (VERCEL FREE PLAN LIMIT)
                </p>
              </div>
            </div>

            {/* 2. 저장 형식 섹션 */}
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

            {/* 3. 언어 선택 섹션 */}
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

            {/* 4. 목소리 선택 섹션 */}
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

            {/* 실행 버튼 */}
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              className={`w-full py-5 rounded-full font-black text-sm tracking-widest transition-all shadow-xl ${
                loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {loading ? progress.toUpperCase() : 'GENERATE DUBBING'}
            </button>

            {/* 결과 표시 섹션 */}
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
                <a 
                  href={resultUrl} 
                  download={`dubbed_result.${saveMode}`} 
                  className="inline-flex items-center gap-2 text-xs font-black border-b-2 border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all uppercase tracking-tighter"
                >
                  Download {saveMode} File
                </a>
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