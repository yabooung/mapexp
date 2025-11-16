import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MAPEXP - 일본/한국 지역 경험치 맵",
  description: "일본 47개 도도부현과 한국 17개 시도의 방문 경험을 기록하고 시각화하는 웹 애플리케이션",
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
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 bg-gray-50">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
