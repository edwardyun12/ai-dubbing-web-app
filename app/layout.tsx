import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthContext from "@/components/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Video Dubbing", // 타이틀을 프로젝트에 맞게 수정했습니다.
  description: "AI를 이용한 영상 자동 더빙 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko" // 한국어 서비스이므로 ko로 변경했습니다.
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* AuthContext로 감싸서 모든 페이지에서 useSession()을 쓸 수 있게 합니다. */}
        <AuthContext>
          {children}
        </AuthContext>
      </body>
    </html>
  );
}