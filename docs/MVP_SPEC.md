# MAPEXP MVP 상세 스펙

> MVP(Minimum Viable Product) 기능 명세서

## 목표

회원가입 없이 바로 사용 가능한 지역 경험치 기록 및 시각화 서비스의 핵심 기능 구현

## 핵심 기능 스펙

### 1. 지역 경치(經値) 기록 시스템

#### 1.1 경치 점수 체계

```typescript
enum ExpLevel {
  UNVISITED = 0,      // 미방문
  PASSED = 1,         // 지나감
  STOPPED = 2,        // 들름
  VISITED = 3,        // 방문
  RESIDED = 4         // 거주/장기체류
}

interface RegionExp {
  regionId: string;           // 지역 고유 ID
  regionName: string;         // 지역명 (ex: "도쿄도", "서울특별시")
  countryCode: string;        // 국가 코드 (ex: "JP", "KR")
  level: ExpLevel;            // 경치 레벨 (0-4)
  visitedAt?: Date;           // 최초 방문일
  lastVisitedAt?: Date;       // 최근 방문일
  memo?: string;              // 메모 (최대 500자)
  createdAt: Date;            // 기록 생성일
  updatedAt: Date;            // 기록 수정일
}
```

#### 1.2 지역 선택 UI

**지도 기반 선택**
- 지도에서 지역을 클릭하여 선택
- 선택된 지역 하이라이트 표시
- 이미 기록된 지역은 색상으로 구분

**리스트 기반 선택**
- 국가별 행정구역 리스트
- 검색 기능 (한글, 영문, 일본어 지원)
- 알파벳/가나다순 정렬
- 필터링 (미방문/방문 지역)

#### 1.3 점수 입력 UI

```
┌─────────────────────────────────┐
│ 도쿄도 (Tokyo)                   │
├─────────────────────────────────┤
│ 경치 레벨 선택:                  │
│                                 │
│ ○ 0 - 미방문                    │
│ ● 1 - 지나감                    │
│ ○ 2 - 들름                      │
│ ○ 3 - 방문                      │
│ ○ 4 - 거주/장기체류              │
│                                 │
│ 방문일: [2024-01-15] (선택사항) │
│                                 │
│ 메모: ___________________       │
│      (500자 이내)               │
│                                 │
│ [저장] [취소]                   │
└─────────────────────────────────┘
```

### 2. 지도 시각화

#### 2.1 지원 국가 (MVP)

1. **일본** (우선순위 1)
   - 47개 도도부현 (都道府県)
   - GeoJSON 데이터 필요

2. **한국** (우선순위 2)
   - 17개 시도
   - GeoJSON 데이터 필요

#### 2.2 지도 렌더링

**기술 스택 옵션**
- Option A: Leaflet + GeoJSON
  - 장점: 가볍고 빠름, 인터랙티브
  - 단점: 디자인 커스터마이징 제한

- Option B: D3.js + SVG
  - 장점: 완전한 커스터마이징, 애니메이션
  - 단점: 러닝 커브, 성능 최적화 필요

**추천: Leaflet (MVP), D3.js (v2.0+)**

#### 2.3 색상 체계

```typescript
const COLOR_SCHEME = {
  unvisited: '#E5E5E5',      // 회색 (미방문)
  passed: '#FEF3C7',         // 연한 노랑 (지나감)
  stopped: '#FCD34D',        // 노랑 (들름)
  visited: '#F59E0B',        // 주황 (방문)
  resided: '#DC2626',        // 빨강 (거주)
  hover: '#3B82F6',          // 파랑 (호버)
  selected: '#8B5CF6'        // 보라 (선택됨)
};
```

#### 2.4 인터랙티브 기능

**호버 효과**
- 지역 위에 마우스를 올리면:
  - 지역명 표시
  - 현재 경치 레벨 표시
  - 하이라이트 효과

**클릭 이벤트**
- 지역 클릭 시:
  - 상세 정보 모달/사이드바 표시
  - 경치 레벨 편집 UI 표시
  - 메모 표시/편집

**줌/팬**
- 지도 확대/축소
- 드래그로 이동
- 모바일 핀치 줌 지원

#### 2.5 통계 표시

```
┌─────────────────────────────┐
│ 일본 경치 통계               │
├─────────────────────────────┤
│ 총 경치:          127       │
│ 방문 지역:        32/47     │
│ 달성률:           68.1%     │
│ 평균 경치:        2.7       │
│                             │
│ 레벨별 분포:                │
│ ▓▓▓▓░░░░ 거주 (4):  3      │
│ ▓▓▓▓▓▓░░ 방문 (3):  12     │
│ ▓▓▓▓░░░░ 들름 (2):  8      │
│ ▓▓░░░░░░ 지나감 (1): 9     │
│ ▓▓▓▓▓▓▓▓ 미방문 (0): 15    │
└─────────────────────────────┘
```

### 3. 로컬 저장

#### 3.1 데이터 구조

```typescript
interface MapExpData {
  version: string;              // 데이터 버전 (ex: "1.0.0")
  userId: string;               // 임시 사용자 ID (UUID)
  regions: RegionExp[];         // 지역 경치 배열
  settings: UserSettings;       // 사용자 설정
  createdAt: Date;             // 최초 생성일
  updatedAt: Date;             // 최근 업데이트일
}

interface UserSettings {
  defaultCountry: string;       // 기본 국가 (ex: "JP")
  colorScheme: 'default' | 'custom';
  customColors?: Record<string, string>;
  language: 'ko' | 'ja' | 'en';
}
```

#### 3.2 저장 방식

**LocalStorage (기본)**
```typescript
const STORAGE_KEY = 'mapexp_data_v1';

// 저장
function saveData(data: MapExpData): void {
  const json = JSON.stringify(data);
  localStorage.setItem(STORAGE_KEY, json);
}

// 불러오기
function loadData(): MapExpData | null {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return null;
  return JSON.parse(json);
}
```

**용량 제한**
- LocalStorage: 최대 5-10MB
- 예상 데이터 크기: ~10-50KB (1000개 지역 기준)
- 충분한 여유 공간

#### 3.3 자동 저장

- 경치 레벨 변경 시 즉시 저장
- Debounce 적용 (메모 입력 시)
- 저장 실패 시 재시도 로직
- 저장 성공/실패 피드백

#### 3.4 데이터 내보내기/가져오기

**JSON 내보내기**
```typescript
function exportData(): void {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mapexp_backup_${Date.now()}.json`;
  a.click();
}
```

**JSON 가져오기**
```typescript
function importData(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result as string);
        validateData(data); // 데이터 검증
        saveData(data);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
```

### 4. 공유 기능

#### 4.1 URL 기반 공유

**인코딩 방식**
```typescript
interface ShareData {
  v: string;                    // 버전
  r: Array<[string, number]>;   // [regionId, level]
  c: string;                    // 국가 코드
}

function generateShareUrl(data: MapExpData): string {
  const shareData: ShareData = {
    v: '1',
    r: data.regions.map(r => [r.regionId, r.level]),
    c: data.settings.defaultCountry
  };

  // LZ-String 압축 + Base64 인코딩
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(shareData)
  );

  return `${window.location.origin}?share=${compressed}`;
}
```

**URL 예시**
```
https://mapexp.app?share=N4IgJg9gTg...
```

**크기 제한**
- URL 최대 길이: ~2000자
- 압축 후 예상 크기: 200-500자 (47개 지역 기준)

#### 4.2 이미지 캡처

**html2canvas 활용**
```typescript
import html2canvas from 'html2canvas';

async function captureMap(): Promise<Blob> {
  const mapElement = document.getElementById('map-container');
  const canvas = await html2canvas(mapElement, {
    backgroundColor: '#ffffff',
    scale: 2  // Retina 대응
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob));
  });
}
```

**다운로드 기능**
```typescript
async function downloadMapImage(): Promise<void> {
  const blob = await captureMap();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mapexp_${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### 4.3 SNS 공유 템플릿

**공유 텍스트 생성**
```typescript
function generateShareText(data: MapExpData): string {
  const country = data.settings.defaultCountry === 'JP' ? '일본' : '한국';
  const total = data.regions.reduce((sum, r) => sum + r.level, 0);
  const visited = data.regions.filter(r => r.level > 0).length;
  const totalRegions = data.regions.length;
  const percentage = ((visited / totalRegions) * 100).toFixed(1);

  return `나의 ${country} 경치 기록\n` +
         `총 경치: ${total}\n` +
         `방문: ${visited}/${totalRegions} (${percentage}%)\n\n` +
         `#MAPEXP #여행기록 #${country}여행`;
}
```

**공유 버튼**
- 트위터/X
- 페이스북
- 카카오톡
- 링크 복사
- 이미지 다운로드

## 화면 구성

### 메인 화면 (Desktop)

```
┌────────────────────────────────────────────────────────┐
│ MAPEXP                     [일본▼] [공유] [메뉴]        │
├────────────────┬───────────────────────────────────────┤
│                │                                       │
│  통계 패널      │                                       │
│                │                                       │
│  총 경치: 127  │                                       │
│  방문: 32/47   │         지도 영역                     │
│  달성률: 68%   │                                       │
│                │                                       │
│  [검색]        │                                       │
│                │                                       │
│  지역 리스트   │                                       │
│  ▼ 간토        │                                       │
│    도쿄도 ★★★  │                                       │
│    카나가와 ★★ │                                       │
│  ▼ 간사이      │                                       │
│    오사카부 ★★★│                                       │
│    교토부 ★★★★ │                                       │
│                │                                       │
└────────────────┴───────────────────────────────────────┘
```

### 모바일 화면

```
┌──────────────────────┐
│ MAPEXP  [☰] [공유]   │
├──────────────────────┤
│                      │
│                      │
│      지도 영역       │
│                      │
│                      │
├──────────────────────┤
│ [지도] [리스트] [통계]│
└──────────────────────┘
```

## 기술 구현 상세

### 상태 관리 (Zustand)

```typescript
interface MapExpStore {
  // 데이터
  regions: RegionExp[];
  settings: UserSettings;

  // UI 상태
  selectedRegion: string | null;
  selectedCountry: string;

  // 액션
  updateRegion: (regionId: string, level: ExpLevel, memo?: string) => void;
  selectRegion: (regionId: string | null) => void;
  setCountry: (countryCode: string) => void;
  importData: (data: MapExpData) => void;
  exportData: () => MapExpData;
  clearData: () => void;
}
```

### 성능 최적화

1. **지도 렌더링**
   - SVG 대신 Canvas 사용 (대량 폴리곤)
   - 뷰포트 기반 렌더링 (보이는 영역만)
   - Memoization (React.memo, useMemo)

2. **데이터 로딩**
   - GeoJSON 데이터 압축 (gzip)
   - 청크 분할 (국가별 별도 파일)
   - 레이지 로딩

3. **저장 최적화**
   - Debounce (메모 입력)
   - Throttle (지도 인터랙션)
   - 변경 감지 (diff 기반 저장)

### 접근성 (a11y)

- 키보드 네비게이션 지원
- ARIA 레이블
- 색각 이상 대응 (패턴 추가)
- 스크린 리더 지원
- 고대비 모드

## 개발 우선순위

### Phase 1 (Week 1-2): 기본 구조
- [ ] 프로젝트 셋업 (React + Vite + TypeScript)
- [ ] 기본 라우팅 및 레이아웃
- [ ] 상태 관리 구조 (Zustand)
- [ ] 데이터 모델 정의

### Phase 2 (Week 3-4): 지도 시각화
- [ ] GeoJSON 데이터 수집 (일본, 한국)
- [ ] Leaflet 통합
- [ ] 지역별 색상 표시
- [ ] 인터랙티브 기능 (호버, 클릭)

### Phase 3 (Week 5-6): 경치 기록
- [ ] 지역 선택 UI
- [ ] 점수 입력 폼
- [ ] LocalStorage 저장/로드
- [ ] 자동 저장 구현

### Phase 4 (Week 7): 통계 및 리스트
- [ ] 통계 패널
- [ ] 지역 리스트 뷰
- [ ] 검색 기능
- [ ] 필터링

### Phase 5 (Week 8): 공유 기능
- [ ] URL 기반 공유
- [ ] 이미지 캡처
- [ ] SNS 공유 버튼
- [ ] 링크 복사

### Phase 6 (Week 9-10): 다듬기
- [ ] 반응형 디자인
- [ ] 애니메이션 및 트랜지션
- [ ] 에러 처리
- [ ] 로딩 상태
- [ ] 접근성 개선

### Phase 7 (Week 11-12): 테스트 및 배포
- [ ] 단위 테스트
- [ ] E2E 테스트
- [ ] 성능 최적화
- [ ] SEO 최적화
- [ ] 배포 (Vercel/Netlify)

## 테스트 시나리오

### 핵심 시나리오

1. **첫 방문 사용자**
   - 빈 지도 표시
   - 튜토리얼 표시 (선택)
   - 첫 지역 기록

2. **기존 사용자**
   - LocalStorage에서 데이터 로드
   - 지도에 기록된 지역 표시
   - 추가 기록 및 수정

3. **공유 링크 접속**
   - URL에서 데이터 파싱
   - 읽기 전용 모드로 표시
   - "내 것으로 복사" 버튼

4. **데이터 마이그레이션**
   - 기존 데이터 백업
   - 새 데이터 가져오기
   - 병합 옵션 제공

### 엣지 케이스

- LocalStorage 가득 참
- 잘못된 공유 URL
- 구버전 데이터 포맷
- 네트워크 오프라인
- 브라우저 호환성

## 성공 지표 (KPI)

### MVP 단계
- 일 활성 사용자(DAU): 100명
- 평균 기록 지역 수: 10개
- 공유 링크 생성: DAU의 30%
- 재방문율: 40%

### 피드백 수집
- 사용자 설문
- 행동 분석 (GA4)
- 에러 트래킹 (Sentry)
- 성능 모니터링 (Lighthouse)

## 다음 단계 (Post-MVP)

1. **추가 국가 지원** (v1.1)
   - 미국 (50개 주)
   - 중국 (34개 성급 행정구역)
   - 유럽 주요 국가

2. **계정 시스템** (v2.0)
   - 소셜 로그인
   - 클라우드 동기화
   - 멀티 디바이스 지원

3. **커뮤니티 기능** (v3.0)
   - 친구 초대
   - 랭킹
   - 뱃지 시스템

---

**마지막 업데이트**: 2025-10-28
**버전**: 1.0.0
