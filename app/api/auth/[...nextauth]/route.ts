import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

// 1. Turso DB 클라이언트 설정 (서버 시작 시 한 번만 생성되도록 핸들러 외부에서 선언)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // 보안을 위한 Secret 설정
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
    async signIn({ user }) {
      // 이메일이 없으면 즉시 차단
      if (!user.email) {
        console.log("로그인 차단: 이메일 정보 없음");
        return false;
      }

      try {
        // 2. 화이트리스트 테이블에서 이메일 존재 여부 확인
        const result = await db.execute({
          sql: "SELECT 1 FROM whitelist WHERE email = ? LIMIT 1",
          args: [user.email],
        });

        const isWhitelisted = result.rows.length > 0;
        
        // 터미널에서 흐름을 파악하기 위한 로그
        console.log(`[Auth] 로그인 시도: ${user.email} | 결과: ${isWhitelisted ? "✅ 허용" : "❌ 차단"}`);
        
        // true면 로그인 진행, false면 /auth/error?error=AccessDenied로 리다이렉트
        return isWhitelisted; 
      } catch (error) {
        console.error("─── DB 조회 에러 발생 ───");
        console.error(error);
        return false; 
      }
    },
    // 세션에 유저 정보를 유지하기 위한 추가 설정 (선택사항)
    async session({ session, token }) {
      return session;
    }
  },
  
  // 에러 발생 시 커스텀 페이지로 이동
  pages: {
    error: '/auth/error', 
  },
});

export { handler as GET, handler as POST };