'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";

/**
 * @page DubbingPage
 * @description 메인 더빙 서비스 페이지입니다. 로그인 여부를 확인하고 파일 업로드 및 더빙 요청을 처리합니다.
 */
export default function DubbingPage() {
  // 1. NextAuth 세션 데이터 가져오기 (로그인 여부 및 사용자 정보)
  const { data: session } = useSession();
  
  // 2. 상태 관리 (파일, 언어, 결과 URL, 로딩 상태)
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('en');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * 더빙 요청 제출 핸들러
   */
  const handleSubmit = async () => {
    if (!file) {
      alert("파일을 선택해주세요!");
      return;
    }

    setLoading(true);
    setResultUrl(null); // 이전 결과 초기화

    // FormData 객체를 생성하여 멀티파트 파일 업로드 준비
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
        throw new Error(errorData.error || "더빙 생성에 실패했습니다.");
      }

      // 서버로부터 받은 오디오 바이너리 데이터를 Blob 객체로 변환
      const blob = await res.blob();
      // 브라우저에서 재생 가능한 임시 URL 생성
      setResultUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      console.error("[Dubbing Error]", error);
      alert(error.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-10 flex flex-col items-center">
      
      {/* 1. 상단 사용자 상태 바: 로그인 시 이메일과 로그아웃 버튼 표시 */}
      <div className="w-full max-w-md mb-6 flex justify-end items-center gap-3">
        {session && (
          <>
            <span className="text-sm text-gray-600 font-medium">{session.user?.email}</span>
            <button 
              onClick={() => signOut()}
              className="text-xs font-semibold bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </>
        )}
      </div>

      {/* 메인 카드 레이아웃 */}
      <div className="max-w-md w-full border border-gray-200 bg-white p-8 rounded-2xl shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">AI Video Dubbing</h1>
          <p className="text-sm text-gray-500 mt-2">로그인 후 간편하게 AI 더빙 서비스를 이용해보세요.</p>
        </header>
        
        {/* 2. 조건부 렌더링: 로그인 전/후 UI 분기 */}
        {!session ? (
          // 로그인 전: 구글 로그인 버튼 표시
          <div className="flex flex-col items-center py-4">
            <button 
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl bg-white text-gray-700 font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" className="w-5 h-5" />
              Google로 시작하기
            </button>
          </div>
        ) : (
          // 로그인 후: 더빙 설정 및 파일 업로드 UI 표시
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 파일 선택 섹션 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">파일 업로드 (MP4, MP3)</label>
              <input 
                type="file" 
                accept="video/*,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* 언어 선택 섹션 */}
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

            {/* 제출 버튼 */}
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-bold transition-all ${
                loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95'
              }`}
            >
              {loading ? '더빙 생성 중...' : '더빙 시작하기'}
            </button>

            {/* 결과물 출력 섹션: 결과 URL이 있을 때만 표시 */}
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