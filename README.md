# MAPEXP (MapExp) - 지역 경험치 기록 서비스

> 당신이 방문한 모든 지역을 기록하고, 경험치로 시각화하세요.

## 개요

MAPEXP는 사용자가 방문한 지역을 기록하고 "경치(經値, Experience Points)"로 환산하여 지도에 시각화하는 웹 서비스입니다. 회원가입 없이 바로 시작할 수 있으며, 친구들과 쉽게 공유할 수 있습니다.

### 핵심 가치

- **즉시 시작**: 회원가입 없이 LocalStorage 기반으로 바로 사용
- **직관적 시각화**: 방문한 지역을 한눈에 볼 수 있는 인터랙티브 지도
- **쉬운 공유**: URL 기반 공유로 친구들에게 내 여행 경험 자랑하기
- **게임화**: 레벨, 랭킹, 뱃지 시스템으로 재미있게 기록

## 경치(經値) 시스템

방문 정도에 따라 0~4단계로 점수를 기록합니다:

| 점수 | 단계 | 설명 |
|------|------|------|
| 0 | 미방문 | 아직 가보지 않은 곳 |
| 1 | 지나감 | 경유하거나 통과한 곳 |
| 2 | 들름 | 잠깐 들른 곳 |
| 3 | 방문 | 제대로 방문한 곳 |
| 4 | 거주/장기체류 | 살았거나 장기간 머문 곳 |

## 주요 기능

### MVP (v1.0)

- [x] 지역 경치 기록
  - 지역 선택 및 점수 입력
  - 0~4 단계 점수 시스템
  - 지역별 메모 기능
- [x] 지도 시각화
  - 일본/한국 행정구역 지도
  - 경치 단계별 색상 표시
  - 인터랙티브 툴팁
- [x] 로컬 저장
  - LocalStorage 기반 데이터 저장
  - 자동 저장
  - 데이터 내보내기/가져오기
- [x] 공유 기능
  - URL 기반 공유
  - 지도 이미지 캡처
  - SNS 공유 템플릿

### 차후 확장 기능 (v2.0)

- [ ] 다국가 지원
  - 일본 → 한국 → 미국 → 유럽 → 전 세계
  - 국가별 행정구역 자동 처리
- [ ] 자동 경치 계산
  - GPS 기반 이동 기록
  - 사진 EXIF 데이터 분석
  - 체류 시간 기반 자동 점수 산정
- [ ] 계정 시스템
  - 소셜 로그인 (Google, Apple, Kakao)
  - 멀티 디바이스 동기화
  - 클라우드 백업
- [ ] 커스터마이징
  - 컬러 테마 선택
  - 점수 시스템 커스터마이징
  - UI 테마 (미니멀, 게임형, 오타쿠형)

### 커뮤니티 & 게임화 (v3.0)

- [ ] 레벨/랭킹 시스템
  - 총 경치 기반 레벨 계산
  - 국가별/지역별 랭킹
  - 친구 비교 기능
- [ ] 뱃지 & 업적
  - 방문 달성률 뱃지
  - 특수 지역 방문 뱃지
  - 테마별 업적 (온천, 축제, 산악 등)
- [ ] SNS 공유 강화
  - 자동 이미지 생성
  - 통계 요약 카드
  - 공유 템플릿

### 상업화 (v4.0)

- [ ] 추천 시스템
  - 미방문 지역 추천
  - 성향 기반 여행지 추천
  - AI 기반 맞춤 추천
- [ ] 프리미엄 기능
  - 여행 기록 분석
  - 사진/영상 타임라인
  - 가족/친구 공유 지도
  - 광고 제거
- [ ] 파트너십
  - 여행사 제휴 혜택
  - 지역별 할인 쿠폰
  - 방문 인증 이벤트

## 기술 스택

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Map Library**: Leaflet / D3.js
- **State Management**: Zustand
- **Data Persistence**: LocalStorage / IndexedDB

### Backend (Phase 2+)
- **Runtime**: Node.js / Bun
- **Framework**: Express / Hono
- **Database**: PostgreSQL + PostGIS
- **Auth**: OAuth 2.0 (Google, Apple, Kakao)
- **Storage**: S3-compatible object storage

### Data
- **GeoJSON**: 국가별 행정구역 경계 데이터
- **Open Source**: 일부 컴포넌트 오픈소스화

## 프로젝트 구조

```
mapexp/
├── docs/                 # 문서
│   ├── MVP_SPEC.md      # MVP 상세 스펙
│   ├── ARCHITECTURE.md  # 기술 아키텍처
│   └── ROADMAP.md       # 개발 로드맵
├── packages/            # 모노레포 패키지
│   ├── web/            # 메인 웹 애플리케이션
│   ├── region-exp/     # 경치 계산 라이브러리 (오픈소스)
│   ├── region-map/     # 지도 시각화 컴포넌트 (오픈소스)
│   └── geojson/        # 국가별 GeoJSON 데이터 (오픈소스)
└── server/             # 백엔드 서버 (Phase 2+)
```

## 시작하기

### 요구사항

- Node.js 18+
- npm 또는 pnpm

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/yourusername/mapexp.git
cd mapexp

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

### 로컬 개발

```bash
# 개발 모드로 실행
npm run dev

# 테스트
npm run test

# 린트
npm run lint

# 타입 체크
npm run type-check
```

## 오픈소스 전략

MAPEXP는 핵심 서비스는 비공개로 유지하되, 재사용 가능한 컴포넌트를 오픈소스로 공개합니다:

### 오픈소스 컴포넌트

1. **mapexp-region-exp**: 지역 경치 계산 라이브러리
2. **mapexp-region-map**: 지도 시각화 React 컴포넌트
3. **mapexp-geojson**: 국가별 행정구역 GeoJSON 데이터

### 비공개 컴포넌트

- 메인 웹 애플리케이션
- 백엔드 API
- 사용자 데이터 및 인증 시스템
- 프리미엄 기능

## 개발 로드맵

| 단계 | 기간 | 주요 기능 |
|------|------|-----------|
| MVP (v1.0) | 1-2개월 | 지역 기록, 지도 시각화, 로컬 저장, 공유 |
| 확장 (v2.0) | 2-3개월 | 다국가 지원, 자동 기록, 계정 시스템 |
| 커뮤니티 (v3.0) | 2-3개월 | 레벨/랭킹, 뱃지, SNS 강화 |
| 상업화 (v4.0) | 3-4개월 | 추천 시스템, 프리미엄, 파트너십 |

자세한 로드맵은 [ROADMAP.md](docs/ROADMAP.md)를 참고하세요.

## 기여하기

이 프로젝트는 현재 비공개 개발 중입니다. 오픈소스 컴포넌트에 대한 기여는 각 패키지의 저장소에서 가능합니다.

## 라이선스

- **메인 서비스**: Proprietary (비공개)
- **오픈소스 컴포넌트**: MIT License

## 문의

- 이슈: GitHub Issues
- 이메일: [your-email@example.com]

---

Made with ❤️ for travelers and explorers
