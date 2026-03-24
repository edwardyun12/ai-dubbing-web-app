import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthContext from "../components/AuthContext";

/**
 * 1. 폰트 설정
 * - 구글 폰트(Geist)를 프로젝트에 불러옵니다.
 * - variable 설정을 통해 CSS 변수로 만들어 globals.css에서 사용할 수 있게 합니다.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * 2. 메타데이터 설정
 * - 웹사이트의 제목(Title)과 설명(Description)을 설정합니다.
 * - 브라우저 탭에 표시되는 이름과 검색 엔진 최적화(SEO)에 사용됩니다.
 */
export const metadata: Metadata = {
  title: "AI Video Dubbing",
  description: "AI를 이용한 영상 자동 더빙 서비스",
};

/**
 * 3. 루트 레이아웃 (RootLayout)
 * - 앱 전체를 감싸는 가장 바깥쪽 틀입니다.
 * - 모든 페이지(children)는 이 레이아웃 안에서 렌더링됩니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="ko"는 이 사이트가 한국어 기반임을 브라우저에 알립니다.
    <html lang="ko" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}>
        {/**
         * 4. 인증 컨텍스트 (AuthContext) 적용
         * - SessionProvider를 포함한 AuthContext로 전체 앱을 감쌉니다.
         * - 이제 앱 내의 어떤 페이지나 컴포넌트에서도 useSession() 훅을 사용하여
         * 현재 로그인한 유저 정보를 가져올 수 있습니다.
         */}
        <AuthContext>
          {children}
        </AuthContext>
      </body>
    </html>
  );
}