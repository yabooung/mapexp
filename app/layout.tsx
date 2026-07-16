import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";

// Pretendard 가변 폰트 - Windows 100% 배율에서도 힌팅이 좋아 저해상도 렌더링 품질이 높다
const pretendard = localFont({
  src: "../src/fonts/PretendardVariable.woff2",
  variable: "--font-sans-kr",
  weight: "45 920",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: "MAPEXP - 지역 경험치 맵",
  description: "방문한 지역을 기록하고 경험치를 쌓는 지도 서비스. GPS로 이동 경로를 추적하고 새 지역 방문을 자동으로 기록하세요.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MAPEXP",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 접근성: 페이지 확대 허용 (지도 제스처는 Leaflet이 독립적으로 처리)
  themeColor: "#be3a2b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col h-dvh lg:h-auto lg:min-h-screen">
          <Header />
          <main className="flex-1 min-h-0 overflow-hidden lg:overflow-visible bg-paper">
            {children}
          </main>
          <div className="hidden lg:block">
            <Footer />
          </div>
        </div>
        {/* GPS 현재 지역 배너(지도 상단)와 겹치지 않도록 조금 아래에 표시 */}
        <Toaster
          position="top-center"
          containerStyle={{ top: 120 }}
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              // 레이어드 섀도: 가까운 접촉면 + 부드러운 확산 (플랫 단일 그림자보다 마감이 정돈됨)
              boxShadow: "0 1px 2px rgba(38, 35, 28, 0.08), 0 8px 28px rgba(38, 35, 28, 0.14)",
              fontSize: "14px",
              padding: "10px 16px",
            },
          }}
        />
        <ServiceWorkerRegister />
        {/* 방문 통계 (Vercel 배포 시에만 동작, 쿠키 미사용) */}
        <Analytics />
      </body>
    </html>
  );
}
