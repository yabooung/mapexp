# MAPEXP 개발 환경 설정 가이드

> 프로젝트 시작부터 로컬 실행까지

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [프로젝트 초기 설정](#프로젝트-초기-설정)
3. [모노레포 구조 설정](#모노레포-구조-설정)
4. [개발 도구 설정](#개발-도구-설정)
5. [의존성 설치](#의존성-설치)
6. [로컬 개발 서버 실행](#로컬-개발-서버-실행)

---

## 사전 요구사항

### 필수 도구

```bash
# Node.js 18+ 설치 확인
node --version  # v18.0.0 이상

# pnpm 설치 (권장)
npm install -g pnpm
pnpm --version  # 8.0.0 이상

# Git 설치 확인
git --version
```

### 권장 도구

- **에디터**: VS Code
- **터미널**: iTerm2 (macOS), Windows Terminal (Windows)
- **브라우저**: Chrome (개발자 도구)

### VS Code 확장 프로그램

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

`.vscode/extensions.json` 파일로 저장하면 팀원에게 권장할 수 있습니다.

---

## 프로젝트 초기 설정

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/mapexp.git
cd mapexp
```

### 2. 브랜치 전략

```bash
# main: 프로덕션 코드
# develop: 개발 중인 코드
# feature/*: 새 기능
# fix/*: 버그 수정

# 개발 브랜치 체크아웃
git checkout -b develop
```

---

## 모노레포 구조 설정

### 1. 기본 폴더 구조 생성

```bash
# 루트에서 실행
mkdir -p packages/web
mkdir -p packages/region-exp
mkdir -p packages/region-map
mkdir -p packages/geojson
mkdir -p docs
```

### 2. 루트 package.json 생성

```json
{
  "name": "mapexp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.10.0",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3. pnpm-workspace.yaml 생성

```yaml
packages:
  - 'packages/*'
```

### 4. turbo.json 생성

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 웹 애플리케이션 설정

### 1. Vite + React + TypeScript 프로젝트 생성

```bash
cd packages/web

# Vite 프로젝트 생성
pnpm create vite . --template react-ts

# 또는 수동으로 설정
```

### 2. packages/web/package.json

```json
{
  "name": "@mapexp/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "lz-string": "^1.5.0",
    "zod": "^3.22.4",
    "date-fns": "^3.0.0",
    "html2canvas": "^1.4.1",
    "react-hot-toast": "^2.4.1",
    "react-hook-form": "^7.49.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/leaflet": "^1.9.8",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "vitest": "^1.0.4"
  }
}
```

### 3. vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### 4. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/features/*": ["./src/features/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/store/*": ["./src/store/*"],
      "@/constants/*": ["./src/constants/*"],
      "@/assets/*": ["./src/assets/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5. tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

## Tailwind CSS 설정

### 1. 설치

```bash
cd packages/web
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

### 2. tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        exp: {
          unvisited: '#E5E5E5',
          passed: '#FEF3C7',
          stopped: '#FCD34D',
          visited: '#F59E0B',
          resided: '#DC2626',
        },
      },
    },
  },
  plugins: [],
}
```

### 3. src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors;
  }

  .btn-secondary {
    @apply bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors;
  }
}
```

---

## ESLint & Prettier 설정

### 1. .eslintrc.cjs

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
  },
}
```

### 2. .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
```

### 3. .prettierignore

```
dist
node_modules
pnpm-lock.yaml
*.min.js
```

---

## Git 설정

### 1. .gitignore

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Turbo
.turbo/
```

### 2. Husky & lint-staged 설정

```bash
# 루트에서
pnpm add -D -w husky lint-staged

# husky 초기화
pnpm dlx husky install
pnpm pkg set scripts.prepare="husky install"
```

### 3. .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### 4. package.json에 lint-staged 설정 추가

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## 의존성 설치

```bash
# 루트에서 모든 패키지 설치
cd /path/to/mapexp
pnpm install

# 특정 패키지만
cd packages/web
pnpm install
```

---

## 로컬 개발 서버 실행

### 1. 개발 서버 시작

```bash
# 루트에서 모든 패키지 dev 서버 실행
pnpm dev

# 또는 특정 패키지만
cd packages/web
pnpm dev
```

브라우저에서 `http://localhost:3000` 접속

### 2. 빌드 테스트

```bash
# 프로덕션 빌드
pnpm build

# 빌드 결과 프리뷰
cd packages/web
pnpm preview
```

---

## 환경 변수 설정

### 1. packages/web/.env.local

```bash
# API 엔드포인트 (v2.0+)
VITE_API_URL=http://localhost:8000

# Sentry (에러 트래킹)
VITE_SENTRY_DSN=

# Analytics
VITE_GA_TRACKING_ID=

# Feature Flags
VITE_ENABLE_AUTH=false
VITE_ENABLE_PREMIUM=false
```

### 2. 환경 변수 사용

```typescript
// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
  features: {
    auth: import.meta.env.VITE_ENABLE_AUTH === 'true',
    premium: import.meta.env.VITE_ENABLE_PREMIUM === 'true',
  },
} as const;
```

---

## VS Code 설정

### .vscode/settings.json

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## 트러블슈팅

### pnpm 명령어가 없다고 나올 때

```bash
npm install -g pnpm
```

### TypeScript 경로 alias가 동작하지 않을 때

1. `tsconfig.json`의 `paths` 확인
2. `vite.config.ts`의 `resolve.alias` 확인
3. VS Code 재시작

### Tailwind 클래스가 적용되지 않을 때

1. `tailwind.config.js`의 `content` 경로 확인
2. `src/index.css`에 `@tailwind` 지시어 확인
3. 개발 서버 재시작

### Leaflet 타입 에러

```bash
pnpm add -D @types/leaflet
```

그리고 `src/vite-env.d.ts`에 추가:

```typescript
/// <reference types="vite/client" />
/// <reference types="leaflet" />
```

---

## 다음 단계

설정이 완료되면 다음 가이드를 참고하세요:

1. [GeoJSON 데이터 수집 가이드](./GEOJSON_GUIDE.md)
2. [컴포넌트 구현 가이드](./COMPONENT_GUIDE.md)
3. [배포 가이드](./DEPLOYMENT_GUIDE.md)

---

**작성일**: 2025-10-28
**업데이트**: 설정 변경 시 이 문서도 함께 업데이트해주세요.
