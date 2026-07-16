import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const alt = 'MAPEXP — 나의 여행 도장 지도'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * 링크 공유 미리보기(OG) 이미지 — 페이퍼 & 인주 아이덴티티
 */
export default async function OgImage() {
  // satori는 woff2 미지원 - woff 사용
  const bold = await readFile(join(process.cwd(), 'src/fonts/Pretendard-Bold.woff'))
  const regular = await readFile(join(process.cwd(), 'src/fonts/Pretendard-Regular.woff'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          backgroundColor: '#f5f3ec',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 인장 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 20,
            backgroundColor: '#be3a2b',
            color: '#ffffff',
            fontSize: 52,
            fontWeight: 700,
            transform: 'rotate(-4deg)',
            marginBottom: 40,
          }}
        >
          경
        </div>

        <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: '#26231c', letterSpacing: -2 }}>
          MAPEXP
        </div>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, color: '#26231c', marginTop: 12 }}>
          나의 여행 도장 지도
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#7c766a', marginTop: 20 }}>
          지나가고, 내리고, 걷고, 묵은 자리마다 도장이 쌓입니다
        </div>

        {/* 등급 색 견본 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 48 }}>
          {['#8EE7E3', '#9BE79B', '#FFE88C', '#FF9A8C', '#E58CFF'].map((c) => (
            <div
              key={c}
              style={{
                display: 'flex',
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c,
                border: '2px solid rgba(0,0,0,0.08)',
              }}
            />
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#be3a2b',
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              transform: 'rotate(-4deg)',
            }}
          >
            거
          </div>
        </div>

        {/* 우측 하단 워터마크 */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: 96,
            bottom: 72,
            fontSize: 22,
            color: '#a8a294',
          }}
        >
          광역 63 · 기초 지역 2,100+ · GPS 도장
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}
