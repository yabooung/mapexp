# MAPEXP 스펙

## 타입 정의

```typescript
// 경험치 레벨
enum ExpLevel {
  UNVISITED = 0,      // ⚪ 미방문
  PASSED = 1,         // 🚶 통과
  SHORT_VISIT = 2,    // 📍 짧은 방문
  LONG_VISIT = 3,     // 🗺️ 긴 방문
  STAYED = 4,         // 🏨 숙박
  MASTER = 5          // ⭐ 마스터/거주
}

// 지역 경험치
interface RegionExp {
  id: string;                 // UUID
  regionId: string;           // 지역 ID (ex: "JP-13")
  regionName: string;         // 지역명 (ex: "도쿄도")
  countryCode: string;        // 국가 코드 ("JP" | "KR")
  level: ExpLevel;            // 0-5
  visitedAt?: string;         // 방문일 (ISO 8601)
  visitCount?: number;        // 방문 횟수 (레벨 5용)
  totalNights?: number;       // 총 숙박일 (레벨 5용)
  memo?: string;              // 메모 (최대 500자)
  createdAt: string;          // 생성일
  updatedAt: string;          // 수정일
}

// 전체 데이터
interface MapExpData {
  version: string;            // 데이터 버전
  userId: string;             // UUID
  regions: RegionExp[];       // 지역 배열
  settings: UserSettings;     // 설정
  createdAt: string;
  updatedAt: string;
}

// 사용자 설정
interface UserSettings {
  defaultCountry: 'JP' | 'KR';
  language: 'ko' | 'ja' | 'en';
}
```

## 레벨 시스템

| 레벨 | 이름 | 점수 | 기준 |
|------|------|------|------|
| 0 | 미방문 | 0 | - |
| 1 | 통과 | 1 | 공항 환승, 고속도로 |
| 2 | 짧은 방문 | 2 | 2-3시간 이하 |
| 3 | 긴 방문 | 3 | 반나절-하루 |
| 4 | 숙박 | 4 | 1박 이상 |
| 5 | 마스터/거주 | **8** | 3회+ & 3박+ OR 30일+ |

**레벨 5 조건 (둘 중 하나):**
- **조건 A**: 3회 이상 방문 + 누적 3박 이상
- **조건 B**: 30일 이상 거주

## 색상

```typescript
const COLORS = {
  0: '#E5E5E5',  // ⚪ 회색
  1: '#FEF3C7',  // 🚶 연한 노랑
  2: '#FCD34D',  // 📍 노랑
  3: '#F59E0B',  // 🗺️ 주황
  4: '#DC2626',  // 🏨 빨강
  5: '#FFD700',  // ⭐ 금색
};
```

**레벨 5 특별 표시:**
- 금색 배경
- 굵은 금색 테두리
- ⭐ 별 아이콘 오버레이

## 점수 계산

```typescript
function calculateTotalExp(regions: RegionExp[]): number {
  return regions.reduce((sum, region) => {
    return sum + (region.level === 5 ? 8 : region.level);
  }, 0);
}
```

## 데이터 저장

### LocalStorage (Phase 1)
```typescript
const STORAGE_KEY = 'mapexp_data_v1';
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
```

### 공유 URL
```typescript
// 압축 + Base64
const compressed = LZString.compressToEncodedURIComponent(
  JSON.stringify(shareData)
);
const url = `${origin}?share=${compressed}`;
```

## 지원 지역

### 일본 (47개)
- 홋카이도, 도쿄도, 오사카부, 교토부...
- ISO 3166-2:JP (JP-01 ~ JP-47)

### 한국 (17개)
- 서울, 부산, 대구, 인천, 광주, 대전, 울산, 세종...
- ISO 3166-2:KR (KR-11, KR-26, KR-41...)

## UI 흐름

```
1. 지도 표시 (국가 선택)
   ↓
2. 지역 클릭
   ↓
3. 레벨 선택 모달
   - 0-5 라디오 버튼
   - 레벨 5: 방문횟수/숙박일 입력
   - 방문일, 메모
   ↓
4. 저장 → LocalStorage
   ↓
5. 지도 색상 업데이트
   ↓
6. 통계 자동 계산
```

## 마스터 뱃지

- ⭐ **첫 마스터**: 첫 레벨 5 달성
- ⭐⭐⭐ **트리플 마스터**: 3개 지역 레벨 5
- 👑 **간사이 킹**: 간사이 6개 도부현 모두 레벨 5
- 🌟 **레전드**: 10개 지역 레벨 5
- 🏆 **그랜드 마스터**: 20개 지역 레벨 5

---

**참고**: 상세 구현은 코드 주석 참고
