'use client';

import { SessionProvider } from "next-auth/react";

/**
 * AuthContext: 클라이언트 사이드에서 NextAuth 세션 상태를 공유하기 위한 Wrapper
 * - 이 컴포넌트로 감싸진 하위 모든 컴포넌트에서 useSession() 훅을 사용할 수 있습니다.
 */
export default function AuthContext({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}