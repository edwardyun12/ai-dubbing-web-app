'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from "next-auth/react"; // NextAuth 훅 추가

export default function DubbingPage() {
  const { data: session } = useSession(); // 세션 정보 가져오기
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('en');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      alert("파일을 선택해주세요!");
      return;
    }

    setLoading(true);
    setResultUrl(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetLang', targetLang);

    try {
      const res = await fetch('/api/dub', { 
        method: 'POST', 
        body: formData 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      alert(error.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-10 flex flex-col items-center">
      {/* 1. 상단 사용자 상태 바 */}
      <div className="w-full max-w-md mb-6 flex justify-end items-center gap-3">
        {session ? (
          <>
            <span className="text-sm text-gray-600 font-medium">{session.user?.email}</span>
            <button 
              onClick={() => signOut()}
              className="text-xs font-semibold bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </>
        ) : null}
      </div>

      <div className="max-w-md w-full border border-gray-200 bg-white p-8 rounded-2xl shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">AI Video Dubbing</h1>
          <p className="text-sm text-gray-500 mt-2">로그인 후 간편하게 AI 더빙 서비스를 이용해보세요.</p>
        </header>
        
        {/* 2. 로그인 여부에 따른 조건부 렌더링 */}
        {!session ? (
          <div className="flex flex-col items-center py-4">
            <button 
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" className="w-5 h-5" />
              Google로 시작하기
            </button>
          </div>
        ) : (
          /* 로그인 성공 시 보여줄 더빙 기능 */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">파일 업로드 (MP4, MP3)</label>
              <input 
                type="file" 
                accept="video/*,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">변경할 언어</label>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-white text-black border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="en">영어 (English)</option>
                <option value="ja">일본어 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
                <option value="es">스페인어 (Spanish)</option>
                <option value="fr">프랑스어 (French)</option>
                <option value="de">독일어 (German)</option>
                <option value="zh-CN">중국어 (Chinese Simplified)</option>
                <option value="it">이탈리아어 (Italian)</option>
                <option value="pt">포르투갈어 (Portuguese)</option>
              </select>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-bold transition-all ${
                loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95'
              }`}
            >
              {loading ? '더빙 생성 중...' : '더빙 시작하기'}
            </button>

            {resultUrl && (
              <div className="mt-10 border-t pt-6 text-center animate-in fade-in zoom-in duration-500">
                <p className="text-sm font-bold text-green-600 mb-4">✅ 더빙 완료!</p>
                <audio src={resultUrl} controls className="w-full mb-4" />
                <a 
                  href={resultUrl} 
                  download="dubbed_audio.mp3" 
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  결과 파일 저장하기
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}