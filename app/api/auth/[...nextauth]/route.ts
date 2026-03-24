import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

/**
 * 1. Turso 데이터베이스 연결 설정
 * - Next.js 서버 라이프사이클 전반에서 재사용할 DB 클라이언트를 초기화합니다.
 */
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const handler = NextAuth({
  /**
   * 인증 수단(Providers) 설정
   * - Google OAuth를 통해 사용자 이메일 및 프로필 정보를 획득합니다.
   */
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  // 보안을 위한 환경 변수 (쿠키 암호화 등에 사용)
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    /**
     * @function signIn
     * @description 로그인 시도 시 화이트리스트 기반의 접근 제어를 수행합니다.
     * @param {Object} user - 구글로부터 전달받은 사용자 정보
     * @returns {boolean} 승인 시 true, 거부 시 false 반환
     */
    async signIn({ user }) {
      // 1. 보안 체크: 이메일 정보가 누락된 경우 즉시 로그인을 차단합니다.
      if (!user?.email) {
        console.warn("[Auth Warning] No email provided in Google profile.");
        return false;
      }

      try {
        /**
         * 2. 화이트리스트 검증 (DB 조회)
         * - 'whitelist' 테이블에서 현재 로그인하려는 이메일이 등록되어 있는지 확인합니다.
         * - 성능 최적화를 위해 불필요한 필드 대신 상수(1)만 반환하도록 설계되었습니다.
         */
        const result = await db.execute({
          sql: "SELECT 1 FROM whitelist WHERE email = ? LIMIT 1",
          args: [user.email],
        });

        const isWhitelisted = result.rows.length > 0;
        
        // 개발/운영 모니터링을 위해 터미널에 결과를 남깁니다.
        console.log(`[Auth Log] User: ${user.email} | Status: ${isWhitelisted ? "✅ 승인" : "❌ 거부"}`);
        
        return isWhitelisted; 
      } catch (error) {
        /**
         * 3. 예외 처리
         * - DB 연결 지연이나 쿼리 에러 발생 시 시스템 보호를 위해 로그인을 거부합니다.
         */
        console.error("[Auth Critical Error] Database connection failed:", error);
        return false; 
      }
    },
  },
  
  /**
   * 커스텀 페이지 설정
   * - signIn 콜백이 false를 반환하면 NextAuth는 자동으로 이 경로로 리다이렉트합니다.
   */
  pages: {
    error: '/auth/error', 
  },
});

export { handler as GET, handler as POST };