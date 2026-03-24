'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// 에러 메시지를 읽어오는 컴포넌트
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessage = error === 'AccessDenied' 
    ? "등록된 화이트리스트 사용자만 이용 가능합니다. 관리자에게 문의해 주세요."
    : "인증 과정에서 문제가 발생했습니다. 다시 시도해 주세요.";

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {error === 'AccessDenied' ? "접근 권한이 없습니다" : "로그인 오류"}
      </h1>
      <p className="text-gray-600 mb-8">{errorMessage}</p>
      <div className="space-y-3">
        <Link 
          href="/"
          className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md"
        >
          홈으로 돌아가기
        </Link>
        <p className="text-xs text-gray-400 font-mono">Error Code: {error || 'Unknown'}</p>
      </div>
    </>
  );
}

// 메인 에러 페이지 컴포넌트
export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 p-10 rounded-3xl shadow-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-red-50 p-4 rounded-full">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        {/* useSearchParams를 사용하기 위해 Suspense로 감싸줍니다. */}
        <Suspense fallback={<p>로딩 중...</p>}>
          <ErrorContent />
        </Suspense>
      </div>
    </main>
  );
}