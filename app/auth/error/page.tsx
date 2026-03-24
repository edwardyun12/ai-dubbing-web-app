'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * @function ErrorContent
 * @description URL의 쿼리 스트링에서 에러 정보를 읽어와 적절한 메시지를 렌더링합니다.
 */
function ErrorContent() {
  // 1. Next.js의 useSearchParams를 사용하여 URL 뒤의 ?error=... 값을 가져옵니다.
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // 2. 에러 케이스 분류
  // 'AccessDenied'는 NextAuth의 signIn 콜백에서 false를 반환했을 때 발생하는 값입니다.
  const isAccessDenied = error === 'AccessDenied';
  
  // 상황에 맞는 제목과 설명 설정
  const title = isAccessDenied ? "접근 권한이 없습니다" : "로그인 오류";
  const description = isAccessDenied 
    ? "등록된 화이트리스트 사용자만 이용 가능합니다. 관리자에게 문의해 주세요."
    : "인증 과정에서 문제가 발생했습니다. 다시 시도해 주세요.";

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 mb-8">{description}</p>
      
      <div className="space-y-3">
        {/* 사용자를 메인 화면으로 안전하게 돌려보내는 링크 버튼 */}
        <Link 
          href="/"
          className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
        >
          홈으로 돌아가기
        </Link>
        
        {/* 개발 시 디버깅을 위해 에러 코드를 하단에 작게 표시합니다. */}
        <p className="text-xs text-gray-400 font-mono">Error Code: {error || 'Unknown'}</p>
      </div>
    </>
  );
}

/**
 * @page AuthErrorPage
 * @description NextAuth 인증 중 발생하는 에러를 처리하는 전용 페이지입니다.
 */
export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {/* 화이트박스 레이아웃: 사용자에게 친숙한 카드 형태 UI */}
      <div className="max-w-md w-full bg-white border border-gray-200 p-10 rounded-3xl shadow-sm text-center">
        
        {/* 경고 아이콘 영역: 직관적으로 오류가 발생했음을 알립니다. */}
        <div className="mb-6 flex justify-center">
          <div className="bg-red-50 p-4 rounded-full">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        {/**
         * ⚠️ 중요: Suspense 사용 이유
         * Next.js의 App Router에서는 클라이언트 컴포넌트 내에서 useSearchParams를 사용하면
         * 빌드 시점에 오류가 발생하거나 클라이언트 사이드 렌더링에 문제가 생길 수 있습니다.
         * 이를 방지하기 위해 반드시 Suspense로 감싸주어야 합니다.
         */}
        <Suspense fallback={<p className="text-gray-400">데이터를 불러오는 중...</p>}>
          <ErrorContent />
        </Suspense>
      </div>
    </main>
  );
}