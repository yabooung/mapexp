# 배포 가이드

> 프로덕션 환경 배포 완벽 가이드

## 목차

1. [배포 전 체크리스트](#배포-전-체크리스트)
2. [Vercel 배포 (권장)](#vercel-배포-권장)
3. [Netlify 배포](#netlify-배포)
4. [도메인 연결](#도메인-연결)
5. [성능 최적화](#성능-최적화)
6. [모니터링 설정](#모니터링-설정)
7. [CI/CD 설정](#cicd-설정)

---

## 배포 전 체크리스트

### 1. 빌드 확인

```bash
# 프로덕션 빌드 테스트
cd packages/web
pnpm build

# 빌드 결과 확인
ls -lh dist/

# 로컬에서 프리뷰
pnpm preview
```

### 2. 환경 변수 확인

```bash
# .env.production 파일 생성
cp .env.local .env.production
```

**.env.production**
```bash
VITE_APP_NAME=MAPEXP
VITE_APP_URL=https://mapexp.app
VITE_API_URL=https://api.mapexp.app
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 3. 성능 체크

```bash
# Lighthouse 실행
npx lighthouse http://localhost:4173 --view

# 목표 점수
# Performance: 90+
# Accessibility: 90+
# Best Practices: 90+
# SEO: 90+
```

### 4. 타입 체크 & 린트

```bash
# 타입 에러 확인
pnpm type-check

# 린트 에러 수정
pnpm lint --fix

# 테스트 실행
pnpm test
```

### 5. 번들 크기 분석

```bash
# vite-bundle-visualizer 설치
pnpm add -D vite-bundle-visualizer

# vite.config.ts에 추가
import { visualizer } from 'vite-bundle-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ]
});

# 빌드하면 stats.html 생성됨
pnpm build
```

---

## Vercel 배포 (권장)

### 1. Vercel CLI 설치

```bash
npm install -g vercel
```

### 2. 프로젝트 연결

```bash
# 루트 디렉토리에서
cd /path/to/mapexp

# Vercel 로그인
vercel login

# 프로젝트 연결
vercel link
```

대화형 프롬프트:
```
? Set up and deploy "~/mapexp"? [Y/n] y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] n
? What's your project's name? mapexp
? In which directory is your code located? packages/web
```

### 3. vercel.json 설정

루트에 `vercel.json` 생성:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "packages/web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/geojson/(.*)",
      "dest": "/geojson/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 4. 환경 변수 설정

```bash
# Vercel 대시보드에서 설정하거나 CLI로
vercel env add VITE_SENTRY_DSN production
vercel env add VITE_GA_TRACKING_ID production
```

또는 Vercel 웹 대시보드:
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 환경 변수 추가

### 5. 배포

```bash
# 프리뷰 배포 (자동으로 URL 생성)
vercel

# 프로덕션 배포
vercel --prod
```

### 6. 자동 배포 설정

GitHub 연동:
1. Vercel 대시보드 → Import Project
2. GitHub 저장소 선택
3. 빌드 설정:
   - Framework Preset: Vite
   - Root Directory: packages/web
   - Build Command: `pnpm build`
   - Output Directory: `dist`
4. Deploy 클릭

이후 `main` 브랜치에 푸시하면 자동 배포됩니다.

---

## Netlify 배포

### 1. Netlify CLI 설치

```bash
npm install -g netlify-cli
```

### 2. netlify.toml 설정

루트에 `netlify.toml` 생성:

```toml
[build]
  base = "packages/web"
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/geojson/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

### 3. 배포

```bash
# Netlify 로그인
netlify login

# 프로젝트 초기화
netlify init

# 배포
netlify deploy --prod
```

---

## 도메인 연결

### Vercel에서 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 도메인 입력 (예: mapexp.app)
3. DNS 레코드 설정:

**옵션 A: Vercel 네임서버 사용 (권장)**
- 도메인 등록업체에서 네임서버를 Vercel 것으로 변경

**옵션 B: A 레코드 추가**
```
Type: A
Name: @
Value: 76.76.21.21
```

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. SSL 자동 활성화 (Let's Encrypt)

### Cloudflare 연동 (추가 최적화)

1. Cloudflare에 도메인 추가
2. DNS 설정:
```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
Proxy: Enabled (주황색 구름)
```

3. Cloudflare 대시보드 → Speed → Optimization
   - Auto Minify: HTML, CSS, JS 체크
   - Brotli 압축 활성화

---

## 성능 최적화

### 1. 이미지 최적화

```bash
# sharp 설치
pnpm add -D vite-plugin-imagetools

# vite.config.ts
import { imagetools } from 'vite-plugin-imagetools';

export default defineConfig({
  plugins: [
    react(),
    imagetools()
  ]
});
```

사용:
```typescript
import heroImage from './hero.jpg?w=800&format=webp';
```

### 2. Code Splitting

```typescript
// src/app/router.tsx
import { lazy, Suspense } from 'react';

const Map = lazy(() => import('@/components/map/Map'));
const Stats = lazy(() => import('@/components/stats/StatsPanel'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Map />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </Suspense>
  );
}
```

### 3. GeoJSON 압축

```bash
# GeoJSON 파일을 gzip으로 압축
gzip -k -9 public/geojson/japan.geojson

# Vercel은 자동으로 .gz 파일 제공
# Vite 설정에서 압축 활성화
```

**vite.config.ts**:
```typescript
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
});
```

### 4. 프리로드 & 프리페치

```html
<!-- public/index.html -->
<head>
  <!-- 중요한 리소스 프리로드 -->
  <link rel="preload" href="/geojson/japan.geojson" as="fetch" crossorigin>

  <!-- DNS 프리페치 -->
  <link rel="dns-prefetch" href="https://api.mapexp.app">

  <!-- 폰트 프리로드 -->
  <link rel="preload" href="/fonts/NotoSans-Regular.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

---

## 모니터링 설정

### 1. Sentry (에러 트래킹)

```bash
pnpm add @sentry/react @sentry/vite-plugin
```

**src/main.tsx**:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 2. Google Analytics 4

```bash
pnpm add @types/gtag.js
```

**public/index.html**:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 3. Vercel Analytics

```bash
pnpm add @vercel/analytics
```

**src/main.tsx**:
```typescript
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
```

---

## CI/CD 설정

### GitHub Actions

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: packages/web/dist
```

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

GitHub Secrets 설정:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 secrets 추가:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

---

## 배포 후 체크리스트

### 1. 동작 확인
- [ ] 메인 페이지 로드
- [ ] 지도 렌더링
- [ ] 지역 클릭/선택
- [ ] LocalStorage 저장
- [ ] 공유 링크 생성
- [ ] 공유 링크 접속

### 2. 성능 확인
- [ ] Lighthouse 점수 확인
- [ ] Core Web Vitals 확인
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

### 3. 모니터링 확인
- [ ] Sentry 에러 로그 확인
- [ ] GA4 트래픽 확인
- [ ] Vercel Analytics 동작 확인

### 4. SEO 확인
- [ ] Open Graph 메타 태그
- [ ] Twitter Card
- [ ] sitemap.xml
- [ ] robots.txt

---

## 롤백 전략

### Vercel 롤백

```bash
# 이전 배포로 롤백
vercel rollback

# 특정 배포로 롤백 (대시보드에서)
```

### Git 롤백

```bash
# 이전 커밋으로 되돌리기
git revert HEAD

# 강제 롤백 (주의!)
git reset --hard <commit-hash>
git push --force
```

---

## 트러블슈팅

### 빌드 실패

```bash
# 캐시 삭제 후 재시도
rm -rf node_modules .turbo
pnpm install
pnpm build
```

### 라우팅 404 에러

vercel.json에 SPA 라우팅 설정 확인:
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 환경 변수가 적용 안 됨

- `VITE_` 접두사 확인
- Vercel 대시보드에서 환경 변수 재설정
- 재배포

---

## 다음 단계

배포가 완료되면:

1. 사용자 피드백 수집
2. 성능 모니터링
3. 버그 수정 및 기능 개선
4. [ROADMAP.md](./ROADMAP.md) 참고하여 다음 버전 개발

---

**작성일**: 2025-10-28
**최종 업데이트**: 배포 환경 변경 시 업데이트 필요
