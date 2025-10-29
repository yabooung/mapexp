# MAPEXP

> 일본/한국 여행 경험치를 게임처럼 기록하는 서비스

## 핵심 개념

방문한 지역을 6단계로 기록하고 "경험치"로 시각화:

- **레벨 0**: ⚪ 미방문 (0점)
- **레벨 1**: 🚶 통과 (1점) - 공항, 환승
- **레벨 2**: 📍 짧은 방문 (2점) - 2-3시간
- **레벨 3**: 🗺️ 긴 방문 (3점) - 반나절-하루
- **레벨 4**: 🏨 숙박 (4점) - 1박 이상
- **레벨 5**: ⭐ 마스터/거주 (8점) - 3회+ OR 30일+

## 주요 기능

- 📍 일본 47개 도도부현 / 한국 17개 시도
- 🗺️ 인터랙티브 지도 (Leaflet)
- 💾 LocalStorage 저장 (회원가입 불필요)
- 🔗 URL 공유 (압축된 데이터)
- 📊 통계 및 마스터 지역 표시
- 🏆 마스터 뱃지 시스템

## 기술 스택

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand + persist
- **Map**: Leaflet + react-leaflet
- **Share**: LZ-String (압축)
- **Form**: react-hook-form + zod

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 빌드
npm run build
```

## 프로젝트 구조

```
mapexp/
├── app/                # Next.js App Router
├── src/
│   ├── components/     # React 컴포넌트
│   ├── store/          # Zustand 상태
│   ├── types/          # TypeScript 타입
│   ├── lib/            # 유틸리티
│   └── constants/      # 상수
└── public/geojson/     # 지도 데이터
```

## 문서

- [SPEC.md](./SPEC.md) - 타입 정의 및 핵심 스펙
- [FEATURES.md](./FEATURES.md) - 기능 체크리스트

## 개발 상태

- [x] 문서 작성
- [ ] 프로젝트 설정
- [ ] 타입 정의
- [ ] 지도 구현
- [ ] 상태 관리
- [ ] UI 컴포넌트

---

**목표**: 8-10주 내 MVP 완성
