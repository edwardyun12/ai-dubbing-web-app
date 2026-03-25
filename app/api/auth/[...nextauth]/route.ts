import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

// ✅ 함수로 감싸서 실제 호출 시점에 생성
function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not defined");
  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  });
} 

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      try {
        const db = getDb(); // ✅ 여기서 생성
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
  pages: { error: "/auth/error" },
});

export { handler as GET, handler as POST };