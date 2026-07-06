import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4F46E5",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col h-dvh lg:h-auto lg:min-h-screen">
          <Header />
          <main className="flex-1 min-h-0 overflow-hidden lg:overflow-visible bg-gray-50">
            {children}
          </main>
          <div className="hidden lg:block">
            <Footer />
          </div>
        </div>
        {/* GPS 현재 지역 배너(지도 상단)와 겹치지 않도록 조금 아래에 표시 */}
        <Toaster position="top-center" containerStyle={{ top: 120 }} />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
