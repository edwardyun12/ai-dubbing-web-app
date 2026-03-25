import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

// [중요] 빌드 시점에 이 API를 미리 만들지 않도록 강제합니다.
export const dynamic = "force-dynamic";

// 환경 변수가 없을 경우를 대비해 가짜 URL이라도 넣어 빌드 중단을 막습니다.
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://placeholder.turso.io",
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
      if (!user?.email || !process.env.TURSO_DATABASE_URL) return false;
      try {
        const result = await db.execute({
          sql: "SELECT 1 FROM whitelist WHERE email = ? LIMIT 1",
          args: [user.email],
        });
        return result.rows.length > 0;
      } catch (error) {
        console.error("Auth DB Error:", error);
        return false;
      }
    },
  },
  pages: { error: '/auth/error' },
});

export { handler as GET, handler as POST };