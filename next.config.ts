import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 행정경계 GeoJSON은 사실상 변하지 않는 정적 데이터라 장기 캐시.
        // Vercel 기본값(max-age=0, must-revalidate)이 매 요청 재다운로드를
        // 유발해 outgoing 대역폭을 잡아먹던 것을 브라우저 캐시로 차단한다.
        // 데이터 갱신이 필요하면 파일명에 버전을 붙이거나 max-age를 조정할 것.
        source: "/geojson/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
