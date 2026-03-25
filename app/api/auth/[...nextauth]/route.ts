import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

// [추가] 빌드 시점에 이 API를 정적으로 만들지 않도록 강제합니다.
// 이 설정이 있으면 빌드 시 DB 연결을 시도하지 않습니다.
export const dynamic = "force-dynamic";

/**
 * 1. Turso 데이터베이스 연결 설정
 * - 빌드 타임에 에러가 나지 않도록 URL이 없을 경우 가짜 주소를 제공합니다.
 */
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://placeholder-for-build.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user }) {
      if (!user?.email) {
        console.warn("[Auth Warning] No email provided in Google profile.");
        return false;
      }

      // 실제 환경 변수가 없을 경우에 대한 방어 로직
      if (!process.env.TURSO_DATABASE_URL) {
        console.error("[Auth Error] DATABASE_URL is not defined in environment variables.");
        return false;
      }

      try {
        const result = await db.execute({
          sql: "SELECT 1 FROM whitelist WHERE email = ? LIMIT 1",
          args: [user.email],
        });

        const isWhitelisted = result.rows.length > 0;
        console.log(`[Auth Log] User: ${user.email} | Status: ${isWhitelisted ? "✅ 승인" : "❌ 거부"}`);
        
        return isWhitelisted; 
      } catch (error) {
        console.error("[Auth Critical Error] Database connection failed:", error);
        return false; 
      }
    },
  },
  
  pages: {
    error: '/auth/error', 
  },
});

export { handler as GET, handler as POST };