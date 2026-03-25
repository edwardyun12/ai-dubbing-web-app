import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

// ✅ 함수로 감싸서 실제 호출 시점에 생성되도록 변경
function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not defined");
  }

  return createClient({ url, authToken: authToken || "" });
}

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

      try {
        // ✅ 실제 로그인 시도 시점에 DB 클라이언트 생성
        const db = getDb();

        const result = await db.execute({
          sql: "SELECT 1 FROM whitelist WHERE email = ? LIMIT 1",
          args: [user.email],
        });

        const isWhitelisted = result.rows.length > 0;
        console.log(
          `[Auth Log] User: ${user.email} | Status: ${isWhitelisted ? "✅ 승인" : "❌ 거부"}`
        );

        return isWhitelisted;
      } catch (error) {
        console.error("[Auth Critical Error] Database connection failed:", error);
        return false;
      }
    },
  },

  pages: {
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST };
