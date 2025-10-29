# 개발 가이드

> MAPEXP 프로젝트 개발 워크플로우 및 컨벤션

## 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [Git 워크플로우](#git-워크플로우)
3. [코드 스타일](#코드-스타일)
4. [커밋 컨벤션](#커밋-컨벤션)
5. [PR 가이드](#pr-가이드)
6. [테스트 작성](#테스트-작성)
7. [문서화](#문서화)

---

## 개발 환경 설정

### 1. 저장소 포크 및 클론

```bash
# 포크한 저장소 클론
git clone https://github.com/YOUR_USERNAME/mapexp.git
cd mapexp

# upstream 원격 저장소 추가
git remote add upstream https://github.com/original/mapexp.git
```

### 2. 의존성 설치

```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm

# 의존성 설치
pnpm install
```

### 3. 개발 서버 실행

```bash
# 모든 패키지 dev 서버 실행
pnpm dev

# 특정 패키지만
cd packages/web
pnpm dev
```

자세한 설정은 [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)를 참고하세요.

---

## Git 워크플로우

### 브랜치 전략

```
main
  └── develop
       ├── feature/region-exp-ui
       ├── feature/map-visualization
       ├── fix/storage-bug
       └── docs/update-readme
```

#### 브랜치 타입

- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치
- `feature/*`: 새 기능 개발
- `fix/*`: 버그 수정
- `docs/*`: 문서 작업
- `refactor/*`: 리팩토링
- `test/*`: 테스트 추가/수정
- `chore/*`: 빌드, 설정 등

### 개발 프로세스

#### 1. 최신 코드 동기화

```bash
# upstream에서 최신 코드 가져오기
git fetch upstream
git checkout develop
git merge upstream/develop
```

#### 2. 기능 브랜치 생성

```bash
# develop에서 새 브랜치 생성
git checkout -b feature/your-feature-name develop
```

브랜치명 규칙:
- 소문자, 하이픈 사용
- 명확하고 간결하게
- 예: `feature/region-modal`, `fix/map-crash`

#### 3. 개발 및 커밋

```bash
# 변경 사항 확인
git status

# 스테이징
git add <files>

# 커밋 (컨벤션 준수)
git commit -m "feat: Add region selection modal"
```

#### 4. Push & PR

```bash
# 원격 저장소에 푸시
git push origin feature/your-feature-name
```

GitHub에서 Pull Request 생성

---

## 코드 스타일

### TypeScript

```typescript
// ✓ Good
interface RegionExp {
  id: string;
  regionId: string;
  level: ExpLevel;
}

function updateRegion(id: string, level: ExpLevel): void {
  // ...
}

// ✗ Bad
interface region_exp {
  ID: string;
  RegionID: string;
  Level: number;
}

function UpdateRegion(ID: string, Level: number) {
  // ...
}
```

#### 네이밍 컨벤션

- **파일명**: kebab-case
  - 컴포넌트: `RegionModal.tsx`
  - 유틸리티: `storage-utils.ts`
  - 타입: `region-types.ts`

- **변수/함수**: camelCase
  ```typescript
  const regionExp = getRegionExp();
  const totalExp = calculateTotalExp();
  ```

- **상수**: UPPER_SNAKE_CASE
  ```typescript
  const MAX_REGIONS = 47;
  const STORAGE_KEY = 'mapexp_data_v1';
  ```

- **타입/인터페이스**: PascalCase
  ```typescript
  interface RegionExp { ... }
  type ExpLevel = 0 | 1 | 2 | 3 | 4;
  ```

- **컴포넌트**: PascalCase
  ```typescript
  export function RegionModal() { ... }
  export function StatsPanel() { ... }
  ```

### React 컴포넌트

```typescript
// ✓ Good - 명시적 props 타입
interface RegionCardProps {
  region: RegionExp;
  onClick: (id: string) => void;
}

export function RegionCard({ region, onClick }: RegionCardProps) {
  return (
    <div onClick={() => onClick(region.id)}>
      {region.regionName}
    </div>
  );
}

// ✗ Bad - any 타입, 암묵적 타입
export function RegionCard(props: any) {
  return <div>{props.region.name}</div>;
}
```

#### Hooks 순서

```typescript
function MyComponent() {
  // 1. State hooks
  const [state, setState] = useState();

  // 2. Store hooks
  const regions = useMapExpStore((state) => state.regions);

  // 3. Other hooks
  const navigate = useNavigate();

  // 4. Effects
  useEffect(() => {
    // ...
  }, []);

  // 5. Event handlers
  const handleClick = () => {
    // ...
  };

  // 6. Computed values
  const totalExp = useMemo(() => {
    // ...
  }, [regions]);

  // 7. Render
  return <div>...</div>;
}
```

### CSS (Tailwind)

```typescript
// ✓ Good - 클래스명 정렬 (vscode-tailwindcss 자동 정렬)
<div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-md">

// ✗ Bad - 정렬 없음
<div className="shadow-md p-4 bg-white rounded-lg flex justify-between items-center">
```

---

## 커밋 컨벤션

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type

- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 등
- `perf`: 성능 개선

#### 예시

```bash
# 기능 추가
git commit -m "feat: Add region selection modal"

# 버그 수정
git commit -m "fix: Fix storage quota exceeded error"

# 문서 업데이트
git commit -m "docs: Update installation guide"

# 리팩토링
git commit -m "refactor: Simplify GeoJSON loading logic"

# Scope 포함
git commit -m "feat(map): Add zoom controls"
git commit -m "fix(storage): Handle localStorage quota"

# Body 포함
git commit -m "feat: Add region statistics panel

Display total exp, visited count, and completion rate.
Show level distribution chart.
"

# Breaking change
git commit -m "feat!: Change region ID format

BREAKING CHANGE: Region IDs now use ISO 3166-2 format (JP-13)
instead of custom format. Existing data needs migration.
"
```

### 커밋 메시지 작성 팁

1. **제목은 50자 이내**
2. **제목은 명령문 사용** ("Add" not "Added")
3. **제목 끝에 마침표 없음**
4. **본문은 72자에서 줄바꿈**
5. **무엇을, 왜 했는지 설명** (어떻게는 코드가 설명)

---

## PR 가이드

### PR 템플릿

```markdown
## 변경 사항
- 지역 선택 모달 추가
- 경치 레벨 선택 UI 구현

## 변경 이유
사용자가 지도에서 지역을 클릭했을 때 경치를 기록할 수 있도록 함

## 스크린샷
![modal](./screenshot.png)

## 체크리스트
- [x] 로컬에서 테스트 완료
- [x] 타입 체크 통과
- [x] 린트 에러 없음
- [x] 문서 업데이트 (필요 시)
- [ ] 테스트 작성

## 관련 이슈
Closes #123
```

### PR 생성 전 체크리스트

```bash
# 1. 최신 develop 머지
git fetch upstream
git merge upstream/develop

# 2. 타입 체크
pnpm type-check

# 3. 린트
pnpm lint

# 4. 테스트
pnpm test

# 5. 빌드
pnpm build
```

### 코드 리뷰 가이드라인

#### 리뷰어

- 24시간 내 리뷰
- 건설적인 피드백
- 코드보다 사람을 존중

#### 작성자

- 리뷰 코멘트에 응답
- 변경 사항 반영 후 re-request review
- 논쟁보다는 토론

---

## 테스트 작성

### 단위 테스트 (Vitest)

```typescript
// src/utils/__tests__/exp-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTotalExp } from '../exp-calculator';

describe('calculateTotalExp', () => {
  it('should calculate total exp correctly', () => {
    const regions = [
      { level: 3 },
      { level: 2 },
      { level: 4 },
    ];

    const total = calculateTotalExp(regions);

    expect(total).toBe(9);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalExp([])).toBe(0);
  });
});
```

### 컴포넌트 테스트 (React Testing Library)

```typescript
// src/components/__tests__/RegionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RegionCard } from '../RegionCard';

describe('RegionCard', () => {
  const mockRegion = {
    id: '1',
    regionId: 'JP-13',
    regionName: 'Tokyo',
    level: 3,
  };

  it('should render region name', () => {
    render(<RegionCard region={mockRegion} onClick={() => {}} />);

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<RegionCard region={mockRegion} onClick={onClick} />);

    fireEvent.click(screen.getByText('Tokyo'));

    expect(onClick).toHaveBeenCalledWith('1');
  });
});
```

### E2E 테스트 (Playwright)

```typescript
// tests/e2e/region-selection.spec.ts
import { test, expect } from '@playwright/test';

test('user can select a region and record exp', async ({ page }) => {
  await page.goto('/');

  // 지역 클릭
  await page.click('[data-region-id="JP-13"]');

  // 모달 열림 확인
  await expect(page.locator('text=Tokyo')).toBeVisible();

  // 레벨 선택
  await page.click('input[value="3"]');

  // 저장
  await page.click('button:has-text("저장")');

  // 지도에 반영 확인
  const regionElement = page.locator('[data-region-id="JP-13"]');
  await expect(regionElement).toHaveCSS('fill', 'rgb(245, 158, 11)');
});
```

### 테스트 실행

```bash
# 모든 테스트
pnpm test

# 워치 모드
pnpm test --watch

# 커버리지
pnpm test --coverage

# E2E 테스트
pnpm test:e2e
```

---

## 문서화

### 코드 주석

```typescript
// ✓ Good - JSDoc으로 API 문서화
/**
 * Calculate total experience points from regions
 * @param regions - Array of region experience data
 * @returns Total experience points
 */
export function calculateTotalExp(regions: RegionExp[]): number {
  return regions.reduce((sum, r) => sum + r.level, 0);
}

// ✓ Good - 복잡한 로직 설명
// ISO 3166-2 format: JP-13, KR-11
// First part is country code, second is region code
const [countryCode, regionCode] = regionId.split('-');

// ✗ Bad - 불필요한 주석
// Add 1 to count
count += 1;
```

### README 업데이트

기능 추가 시 README.md 업데이트:
- 새 기능 설명
- 사용 예시
- 스크린샷 (필요 시)

### 변경 로그

`CHANGELOG.md`에 주요 변경 사항 기록:

```markdown
## [0.2.0] - 2025-11-15

### Added
- Region selection modal
- Level distribution chart

### Fixed
- Storage quota exceeded error
- Map rendering on Safari

### Changed
- Improved search performance
```

---

## 커뮤니티 가이드라인

### 행동 강령

1. **존중**: 모든 기여자를 존중
2. **포용**: 다양한 배경의 사람들 환영
3. **건설적**: 피드백은 건설적으로
4. **협력**: 함께 더 나은 프로젝트 만들기

### 질문 및 토론

- 질문: GitHub Discussions
- 버그 리포트: GitHub Issues
- 기능 제안: GitHub Issues (Feature Request 템플릿)

### 도움 요청

막히는 부분이 있다면:
1. 문서 먼저 확인
2. 기존 이슈 검색
3. 새 이슈 생성 (템플릿 사용)

---

## 체크리스트

### 기능 개발 완료 시

- [ ] 로컬에서 동작 확인
- [ ] 타입 체크 통과 (`pnpm type-check`)
- [ ] 린트 에러 없음 (`pnpm lint`)
- [ ] 테스트 작성 및 통과
- [ ] 문서 업데이트
- [ ] 커밋 메시지 컨벤션 준수
- [ ] PR 템플릿 작성

### 버그 수정 완료 시

- [ ] 버그 재현 가능
- [ ] 수정 사항 확인
- [ ] 회귀 테스트 추가
- [ ] 관련 이슈 링크

---

## 참고 자료

- [개발 환경 설정](./docs/SETUP_GUIDE.md)
- [컴포넌트 구현 가이드](./docs/COMPONENT_GUIDE.md)
- [배포 가이드](./docs/DEPLOYMENT_GUIDE.md)
- [로드맵](./docs/ROADMAP.md)

---

**함께 만들어가는 MAPEXP**

여러분의 기여가 MAPEXP를 더 좋은 서비스로 만듭니다. 감사합니다!
