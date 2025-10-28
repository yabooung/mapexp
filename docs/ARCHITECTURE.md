# MAPEXP 기술 아키텍처

> Technical Architecture Document

## 시스템 개요

MAPEXP는 클라이언트 중심의 웹 애플리케이션으로, MVP 단계에서는 완전한 오프라인 작동이 가능한 SPA(Single Page Application)로 구현됩니다.

## 아키텍처 다이어그램

### MVP 아키텍처 (v1.0)

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │          React Application (SPA)             │  │
│  ├──────────────────────────────────────────────┤  │
│  │                                              │  │
│  │  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │   UI Layer  │  │   Map Visualization  │  │  │
│  │  │  (React)    │  │    (Leaflet/D3)      │  │  │
│  │  └──────┬──────┘  └──────────┬───────────┘  │  │
│  │         │                    │              │  │
│  │  ┌──────┴────────────────────┴───────────┐  │  │
│  │  │      State Management (Zustand)      │  │  │
│  │  └──────────────┬───────────────────────┘  │  │
│  │                 │                          │  │
│  │  ┌──────────────┴───────────────────────┐  │  │
│  │  │      Business Logic Layer           │  │  │
│  │  │  - Region Exp Calculator            │  │  │
│  │  │  - Data Validator                   │  │  │
│  │  │  - Share URL Generator              │  │  │
│  │  └──────────────┬───────────────────────┘  │  │
│  │                 │                          │  │
│  │  ┌──────────────┴───────────────────────┐  │  │
│  │  │      Data Persistence Layer         │  │  │
│  │  │  - LocalStorage Manager             │  │  │
│  │  │  - Import/Export Handler            │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │         Browser Storage                    │  │
│  │  - LocalStorage (User Data)                │  │
│  │  - IndexedDB (GeoJSON Cache, optional)     │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────┬───────────────────────────┘
                        │
                        │ (Static Assets)
                        ▼
                  ┌──────────┐
                  │   CDN    │
                  │ (Vercel/ │
                  │ Netlify) │
                  └──────────┘
```

### 확장 아키텍처 (v2.0+)

```
┌──────────────────┐         ┌──────────────────────────┐
│                  │         │                          │
│  Client (SPA)    │◄───────►│    Backend API Server    │
│                  │  HTTPS  │    (Node.js/Bun)         │
│                  │         │                          │
└──────────────────┘         ├──────────────────────────┤
                             │                          │
                             │  ┌────────────────────┐  │
                             │  │  Auth Service      │  │
                             │  │  (OAuth 2.0)       │  │
                             │  └────────────────────┘  │
                             │                          │
                             │  ┌────────────────────┐  │
                             │  │  Sync Service      │  │
                             │  │  (WebSocket)       │  │
                             │  └────────────────────┘  │
                             │                          │
                             │  ┌────────────────────┐  │
                             │  │  Analytics         │  │
                             │  │  Service           │  │
                             │  └────────────────────┘  │
                             │                          │
                             └────────┬─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
            │  PostgreSQL  │  │   Redis     │  │  S3 Storage  │
            │  + PostGIS   │  │   (Cache)   │  │   (Images)   │
            └──────────────┘  └─────────────┘  └──────────────┘
```

## 기술 스택

### Frontend

#### Core
- **React 18+**: UI 라이브러리
- **TypeScript 5+**: 타입 안정성
- **Vite**: 빌드 툴 (빠른 개발 경험)

#### State Management
- **Zustand**: 경량 상태 관리
  - 간단한 API
  - React 통합 우수
  - DevTools 지원

```typescript
// 왜 Zustand인가?
// ✓ Redux보다 간단 (보일러플레이트 최소화)
// ✓ Context API보다 성능 우수
// ✓ Recoil보다 안정적
// ✓ 번들 크기 작음 (~1KB)
```

#### Styling
- **Tailwind CSS**: 유틸리티 우선 CSS
- **Headless UI**: 접근성 좋은 컴포넌트
- **Framer Motion**: 애니메이션 (선택)

#### Map Visualization
- **Leaflet** (MVP): 인터랙티브 지도
  - leaflet.js: 코어 라이브러리
  - react-leaflet: React 래퍼
  - leaflet.markercluster: 마커 클러스터링 (필요시)

- **D3.js** (v2.0+): 커스텀 시각화
  - 완전한 제어
  - 애니메이션
  - 데이터 시각화

#### Data Handling
- **LZ-String**: 데이터 압축 (URL 공유)
- **zod**: 런타임 타입 검증
- **date-fns**: 날짜 처리

#### Utilities
- **html2canvas**: 지도 캡처
- **react-hot-toast**: 토스트 알림
- **react-hook-form**: 폼 관리

### Backend (v2.0+)

#### Runtime & Framework
- **Bun**: 빠른 JavaScript 런타임 (Node.js 대안)
- **Hono**: 경량 웹 프레임워크
  - Edge 런타임 지원
  - TypeScript 우선
  - 빠른 성능

#### Database
- **PostgreSQL 15+**: 주 데이터베이스
- **PostGIS**: 지리 공간 확장
- **Redis**: 캐싱 및 세션

#### Auth
- **Lucia**: 타입 세이프 인증 라이브러리
- OAuth Providers:
  - Google
  - Apple
  - Kakao

#### API
- **tRPC**: 타입 세이프 API
  - End-to-end TypeScript
  - 자동 타입 추론
  - React Query 통합

### DevOps & Infrastructure

#### Hosting
- **Frontend**: Vercel / Netlify
  - Edge Network
  - 자동 배포
  - 프리뷰 환경

- **Backend**: Railway / Fly.io (v2.0+)
  - Global deployment
  - Auto scaling
  - 관리형 데이터베이스

#### CI/CD
- **GitHub Actions**
  - 자동 테스트
  - 린트 체크
  - 타입 체크
  - 배포

#### Monitoring
- **Vercel Analytics**: 웹 바이탈
- **Sentry**: 에러 트래킹
- **PostHog**: 사용자 분석 (오픈소스)

## 데이터 모델

### 클라이언트 데이터 구조

```typescript
// 전체 애플리케이션 데이터
interface MapExpData {
  version: string;              // 데이터 스키마 버전
  userId: string;               // 임시 사용자 ID (UUID v4)
  regions: RegionExp[];         // 지역 경치 배열
  settings: UserSettings;       // 사용자 설정
  metadata: DataMetadata;       // 메타데이터
}

// 지역 경치 데이터
interface RegionExp {
  id: string;                   // UUID
  regionId: string;             // 지역 ID (ex: "JP-13" for Tokyo)
  regionName: string;           // 지역명
  regionNameLocal: string;      // 현지 언어명
  countryCode: string;          // ISO 3166-1 alpha-2
  level: ExpLevel;              // 0-4
  visitedAt?: string;           // ISO 8601 date
  lastVisitedAt?: string;       // ISO 8601 date
  memo?: string;                // 최대 500자
  tags?: string[];              // 사용자 태그
  createdAt: string;            // ISO 8601 datetime
  updatedAt: string;            // ISO 8601 datetime
}

// 경치 레벨
enum ExpLevel {
  UNVISITED = 0,
  PASSED = 1,
  STOPPED = 2,
  VISITED = 3,
  RESIDED = 4
}

// 사용자 설정
interface UserSettings {
  defaultCountry: string;       // 기본 국가
  language: Language;           // UI 언어
  colorScheme: ColorScheme;     // 색상 테마
  customColors?: CustomColors;  // 커스텀 색상
  mapStyle: MapStyle;           // 지도 스타일
  showStats: boolean;           // 통계 표시 여부
  autoSave: boolean;            // 자동 저장
}

// 메타데이터
interface DataMetadata {
  createdAt: string;            // 최초 생성일
  updatedAt: string;            // 최근 업데이트일
  lastSyncedAt?: string;        // 마지막 동기화 (v2.0+)
  exportedAt?: string;          // 내보내기 시각
  deviceInfo?: DeviceInfo;      // 기기 정보
}
```

### 데이터베이스 스키마 (v2.0+)

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  provider VARCHAR(20) NOT NULL,  -- google, apple, kakao
  provider_id VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT FALSE,
  CONSTRAINT unique_provider_id UNIQUE (provider, provider_id)
);

-- 지역 경치
CREATE TABLE region_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id VARCHAR(20) NOT NULL,  -- ex: JP-13
  country_code VARCHAR(2) NOT NULL,
  level SMALLINT NOT NULL CHECK (level >= 0 AND level <= 4),
  visited_at DATE,
  last_visited_at DATE,
  memo TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_region UNIQUE (user_id, region_id)
);

-- 인덱스
CREATE INDEX idx_region_exp_user_id ON region_experiences(user_id);
CREATE INDEX idx_region_exp_country ON region_experiences(country_code);
CREATE INDEX idx_region_exp_level ON region_experiences(level);

-- 공유 링크
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  data JSONB NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_share_links_short_code ON share_links(short_code);
CREATE INDEX idx_share_links_user_id ON share_links(user_id);

-- 업적 (v3.0+)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  condition JSONB NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 업적
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);
```

## 폴더 구조

```
mapexp/
├── packages/
│   ├── web/                          # 메인 웹 앱
│   │   ├── src/
│   │   │   ├── app/                  # 애플리케이션 루트
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   └── router.tsx
│   │   │   ├── components/           # 컴포넌트
│   │   │   │   ├── common/           # 공통 컴포넌트
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── map/              # 지도 관련
│   │   │   │   │   ├── Map.tsx
│   │   │   │   │   ├── MapControls.tsx
│   │   │   │   │   ├── RegionLayer.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── region/           # 지역 관련
│   │   │   │   │   ├── RegionList.tsx
│   │   │   │   │   ├── RegionCard.tsx
│   │   │   │   │   ├── RegionModal.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── stats/            # 통계
│   │   │   │   │   ├── StatsPanel.tsx
│   │   │   │   │   ├── ExpChart.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── share/            # 공유
│   │   │   │       ├── ShareButton.tsx
│   │   │   │       ├── ShareModal.tsx
│   │   │   │       └── ...
│   │   │   ├── features/             # 기능별 모듈
│   │   │   │   ├── region-exp/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── utils/
│   │   │   │   │   └── types/
│   │   │   │   ├── map-viz/
│   │   │   │   └── share/
│   │   │   ├── store/                # 상태 관리
│   │   │   │   ├── index.ts
│   │   │   │   ├── slices/
│   │   │   │   │   ├── regionSlice.ts
│   │   │   │   │   ├── settingsSlice.ts
│   │   │   │   │   └── uiSlice.ts
│   │   │   │   └── middleware/
│   │   │   ├── lib/                  # 라이브러리 래퍼
│   │   │   │   ├── storage.ts
│   │   │   │   ├── share.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── hooks/                # 커스텀 훅
│   │   │   │   ├── useRegionExp.ts
│   │   │   │   ├── useLocalStorage.ts
│   │   │   │   └── ...
│   │   │   ├── utils/                # 유틸리티
│   │   │   │   ├── date.ts
│   │   │   │   ├── color.ts
│   │   │   │   └── validation.ts
│   │   │   ├── types/                # 타입 정의
│   │   │   │   ├── region.ts
│   │   │   │   ├── map.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/            # 상수
│   │   │   │   ├── countries.ts
│   │   │   │   ├── colors.ts
│   │   │   │   └── config.ts
│   │   │   └── assets/               # 정적 자산
│   │   │       ├── images/
│   │   │       └── styles/
│   │   ├── public/
│   │   │   └── geojson/              # GeoJSON 데이터
│   │   │       ├── japan.json
│   │   │       └── korea.json
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── region-exp/                   # 경치 계산 라이브러리 (오픈소스)
│   │   ├── src/
│   │   │   ├── calculator.ts
│   │   │   ├── validator.ts
│   │   │   └── types.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── region-map/                   # 지도 컴포넌트 (오픈소스)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── geojson/                      # GeoJSON 데이터 (오픈소스)
│       ├── data/
│       │   ├── japan/
│       │   └── korea/
│       ├── scripts/
│       │   └── process-geojson.ts
│       └── package.json
│
├── server/                           # 백엔드 (v2.0+)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   └── package.json
│
├── docs/                             # 문서
│   ├── MVP_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── API.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── package.json                      # 루트 package.json (workspace)
├── pnpm-workspace.yaml
├── turbo.json                        # Turborepo 설정
└── README.md
```

## 데이터 흐름

### 지역 경치 기록 플로우

```
1. 사용자 액션
   │
   └─► [UI] 지역 클릭/선택
         │
         └─► [Component] RegionModal 열림
               │
               └─► [Form] 점수 입력
                     │
                     └─► [Action] updateRegion() 호출
                           │
                           ├─► [Store] Zustand 상태 업데이트
                           │     │
                           │     └─► [Middleware] LocalStorage 자동 저장
                           │
                           └─► [UI] 지도 리렌더링
                                 │
                                 └─► 색상 변경 애니메이션
```

### 공유 링크 생성 플로우

```
1. 공유 버튼 클릭
   │
   └─► [Component] ShareModal 열림
         │
         └─► [Util] generateShareUrl()
               │
               ├─► 데이터 직렬화
               │     │
               │     └─► RegionExp[] → ShareData
               │
               ├─► 압축
               │     │
               │     └─► LZ-String.compressToEncodedURIComponent()
               │
               └─► URL 생성
                     │
                     └─► `?share=${compressed}`
                           │
                           └─► [UI] 링크 복사/공유 버튼 표시
```

### 공유 링크 접속 플로우

```
1. URL 파라미터 감지
   │
   └─► [App] useEffect로 ?share 파라미터 확인
         │
         └─► [Util] parseShareUrl()
               │
               ├─► 압축 해제
               │     │
               │     └─► LZ-String.decompressFromEncodedURIComponent()
               │
               ├─► 검증
               │     │
               │     └─► zod schema validation
               │
               └─► [Store] 읽기 전용 모드로 로드
                     │
                     ├─► [UI] "공유된 지도" 표시
                     │
                     └─► [UI] "내 것으로 복사" 버튼
```

## 성능 최적화

### 번들 크기 최적화

```typescript
// 코드 스플리팅
const MapView = lazy(() => import('./components/map/MapView'));
const StatsPanel = lazy(() => import('./components/stats/StatsPanel'));

// Tree shaking
import { compress } from 'lz-string';  // ✓
// import * as LZString from 'lz-string';  // ✗

// Dynamic imports
const loadGeoJSON = async (country: string) => {
  const module = await import(`../data/geojson/${country}.json`);
  return module.default;
};
```

### 렌더링 최적화

```typescript
// React.memo
const RegionCard = memo(({ region }: Props) => {
  // ...
}, (prev, next) => {
  return prev.region.id === next.region.id &&
         prev.region.level === next.region.level;
});

// useMemo
const sortedRegions = useMemo(() => {
  return regions.sort((a, b) => b.level - a.level);
}, [regions]);

// useCallback
const handleRegionClick = useCallback((id: string) => {
  setSelectedRegion(id);
}, []);
```

### 데이터 캐싱

```typescript
// GeoJSON 메모리 캐시
const geoJSONCache = new Map<string, GeoJSON>();

async function loadGeoJSON(country: string): Promise<GeoJSON> {
  if (geoJSONCache.has(country)) {
    return geoJSONCache.get(country)!;
  }

  const data = await fetch(`/geojson/${country}.json`).then(r => r.json());
  geoJSONCache.set(country, data);
  return data;
}
```

## 보안 고려사항

### MVP (클라이언트 전용)

1. **XSS 방어**
   - React의 기본 이스케이핑 활용
   - dangerouslySetInnerHTML 사용 금지
   - 사용자 입력 sanitize (DOMPurify)

2. **데이터 검증**
   - zod를 통한 런타임 검증
   - 공유 URL 파라미터 검증

3. **HTTPS**
   - 모든 리소스 HTTPS로 제공
   - Mixed Content 방지

### v2.0+ (백엔드 포함)

1. **인증/인가**
   - OAuth 2.0 플로우
   - JWT 토큰 (httpOnly 쿠키)
   - CSRF 토큰

2. **API 보안**
   - Rate limiting
   - Input validation
   - SQL injection 방어 (ORM 사용)

3. **데이터 보호**
   - 개인정보 암호화
   - 백업 및 복구
   - GDPR 준수

## 테스팅 전략

### 단위 테스트 (Vitest)

```typescript
// src/utils/__tests__/share.test.ts
describe('generateShareUrl', () => {
  it('should generate valid share URL', () => {
    const data: MapExpData = { /* ... */ };
    const url = generateShareUrl(data);

    expect(url).toMatch(/\?share=/);
    expect(url.length).toBeLessThan(2000);
  });

  it('should be reversible', () => {
    const original: MapExpData = { /* ... */ };
    const url = generateShareUrl(original);
    const parsed = parseShareUrl(url);

    expect(parsed).toEqual(original);
  });
});
```

### 통합 테스트 (React Testing Library)

```typescript
// src/components/map/__tests__/Map.test.tsx
describe('Map', () => {
  it('should render regions with correct colors', () => {
    const regions = [
      { id: '1', level: 3, /* ... */ },
      { id: '2', level: 1, /* ... */ }
    ];

    render(<Map regions={regions} />);

    expect(screen.getByTestId('region-1')).toHaveStyle({
      fill: COLOR_SCHEME.visited
    });
  });
});
```

### E2E 테스트 (Playwright)

```typescript
// tests/e2e/basic-flow.spec.ts
test('user can record region experience', async ({ page }) => {
  await page.goto('/');

  // 지역 선택
  await page.click('[data-region-id="JP-13"]');

  // 점수 입력
  await page.click('[data-level="3"]');
  await page.fill('[name="memo"]', 'Great visit!');
  await page.click('button:has-text("저장")');

  // 확인
  await expect(page.locator('[data-region-id="JP-13"]')).toHaveCSS(
    'fill',
    COLOR_SCHEME.visited
  );
});
```

## 모니터링 & 분석

### 에러 트래킹 (Sentry)

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 민감한 정보 제거
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

### 성능 모니터링

```typescript
// Web Vitals 추적
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // PostHog 또는 GA4로 전송
  analytics.track('Web Vitals', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## 배포 전략

### 프론트엔드 (Vercel)

```yaml
# vercel.json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "packages/web/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run type-check
      - run: pnpm run test
      - run: pnpm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 확장성 고려사항

### 수평 확장 (v2.0+)

- Stateless API 서버
- Redis를 통한 세션 공유
- CDN을 통한 정적 자산 분산
- 데이터베이스 읽기 복제본

### 데이터 파티셔닝

```sql
-- 국가별 파티셔닝
CREATE TABLE region_experiences_partitioned (
  /* columns */
) PARTITION BY LIST (country_code);

CREATE TABLE region_exp_jp PARTITION OF region_experiences_partitioned
  FOR VALUES IN ('JP');

CREATE TABLE region_exp_kr PARTITION OF region_experiences_partitioned
  FOR VALUES IN ('KR');
```

### 캐싱 전략

```
Browser
  ↓ (miss)
CDN Cache (Vercel Edge)
  ↓ (miss)
Redis Cache
  ↓ (miss)
Database
```

---

**마지막 업데이트**: 2025-10-28
**버전**: 1.0.0
