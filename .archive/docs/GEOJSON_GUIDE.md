# GeoJSON 데이터 수집 및 처리 가이드

> 일본/한국 행정구역 지도 데이터 준비하기

## 목차

1. [GeoJSON이란?](#geojson이란)
2. [데이터 소스](#데이터-소스)
3. [일본 데이터 수집](#일본-데이터-수집)
4. [한국 데이터 수집](#한국-데이터-수집)
5. [데이터 처리 및 최적화](#데이터-처리-및-최적화)
6. [지역 메타데이터 생성](#지역-메타데이터-생성)
7. [검증 및 테스트](#검증-및-테스트)

---

## GeoJSON이란?

GeoJSON은 지리 공간 데이터를 JSON 형식으로 표현하는 표준입니다.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "JP-13",
        "name": "Tokyo",
        "name_ja": "東京都",
        "name_ko": "도쿄도"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[139.7, 35.6], [139.8, 35.6], ...]]
      }
    }
  ]
}
```

### 주요 구성 요소

- **type**: 항상 "FeatureCollection"
- **features**: 지역 정보 배열
  - **properties**: 지역 메타데이터 (이름, ID 등)
  - **geometry**: 지리 좌표 데이터
    - **Polygon**: 단일 폴리곤
    - **MultiPolygon**: 여러 폴리곤 (섬 지역)

---

## 데이터 소스

### 1. Natural Earth Data
- URL: https://www.naturalearthdata.com/
- 라이선스: Public Domain
- 특징: 세계 지도, 국가 단위
- 용도: 세계 지도 베이스 (v2.0+)

### 2. geoBoundaries
- URL: https://www.geoboundaries.org/
- 라이선스: Open Data
- 특징: 행정구역 경계 데이터
- 용도: 국가별 세부 행정구역

### 3. OpenStreetMap
- URL: https://www.openstreetmap.org/
- 라이선스: ODbL
- 특징: 커뮤니티 기반, 상세함
- 용도: 고해상도 경계 데이터

### 4. 정부 공공데이터

**일본**
- e-Stat: https://www.e-stat.go.jp/
- 국토교통성: https://nlftp.mlit.go.jp/

**한국**
- 공공데이터포털: https://www.data.go.kr/
- 통계지리정보서비스(SGIS): https://sgis.kostat.go.kr/

---

## 일본 데이터 수집

### 방법 1: geoBoundaries 사용 (권장)

```bash
# ADM1 = 도도부현 (47개)
curl -o japan-adm1.geojson \
  "https://www.geoboundaries.org/api/current/gbOpen/JPN/ADM1/"
```

### 방법 2: Natural Earth Data

```bash
# Natural Earth 데이터 다운로드
wget https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_1_states_provinces.zip

# 압축 해제
unzip ne_10m_admin_1_states_provinces.zip

# Japan만 필터링 (mapshaper 사용)
npx mapshaper ne_10m_admin_1_states_provinces.shp \
  -filter 'admin == "Japan"' \
  -o format=geojson japan.geojson
```

### 방법 3: 직접 수집 (e-Stat)

1. https://www.e-stat.go.jp/ 접속
2. 「境界データ」 검색
3. 도도부현 경계 데이터 다운로드
4. Shapefile → GeoJSON 변환

### 일본 지역 ID 체계

```typescript
// ISO 3166-2:JP 기준
const JAPAN_REGIONS = {
  'JP-01': '北海道', // Hokkaido
  'JP-02': '青森県', // Aomori
  'JP-03': '岩手県', // Iwate
  // ... 47개
  'JP-47': '沖縄県', // Okinawa
};
```

전체 목록: [japan-regions.json](#japan-regionsjson-예시)

---

## 한국 데이터 수집

### 방법 1: 공공데이터포털 (권장)

1. https://www.data.go.kr/ 접속
2. "행정구역 경계" 검색
3. "시도별 행정구역경계" 다운로드
4. Shapefile → GeoJSON 변환

```bash
# ogr2ogr 사용 (GDAL 툴)
ogr2ogr -f GeoJSON korea.geojson korea.shp
```

### 방법 2: SGIS (통계지리정보서비스)

1. https://sgis.kostat.go.kr/ 접속
2. 「통계지리정보서비스」 → 「경계파일」
3. 시도 경계 다운로드
4. GeoJSON 변환

### 방법 3: geoBoundaries

```bash
curl -o korea-adm1.geojson \
  "https://www.geoboundaries.org/api/current/gbOpen/KOR/ADM1/"
```

### 한국 지역 ID 체계

```typescript
// ISO 3166-2:KR 기준
const KOREA_REGIONS = {
  'KR-11': '서울특별시',
  'KR-26': '부산광역시',
  'KR-27': '대구광역시',
  'KR-28': '인천광역시',
  'KR-29': '광주광역시',
  'KR-30': '대전광역시',
  'KR-31': '울산광역시',
  'KR-50': '세종특별자치시',
  'KR-41': '경기도',
  'KR-42': '강원도',
  'KR-43': '충청북도',
  'KR-44': '충청남도',
  'KR-45': '전라북도',
  'KR-46': '전라남도',
  'KR-47': '경상북도',
  'KR-48': '경상남도',
  'KR-49': '제주특별자치도',
};
```

---

## 데이터 처리 및 최적화

### 1. 좌표 정밀도 조정

GeoJSON 파일이 너무 크면 소수점 자리수를 줄입니다.

```javascript
// scripts/simplify-geojson.js
import fs from 'fs';

function simplifyCoordinates(coords, precision = 4) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => Number(c.toFixed(precision)));
  }
  return coords.map(c => simplifyCoordinates(c, precision));
}

function simplifyGeoJSON(inputPath, outputPath, precision = 4) {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  data.features.forEach(feature => {
    if (feature.geometry) {
      feature.geometry.coordinates = simplifyCoordinates(
        feature.geometry.coordinates,
        precision
      );
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(data));

  const inputSize = fs.statSync(inputPath).size;
  const outputSize = fs.statSync(outputPath).size;
  console.log(`Reduced from ${inputSize} to ${outputSize} bytes`);
  console.log(`Compression: ${((1 - outputSize/inputSize) * 100).toFixed(1)}%`);
}

// 사용
simplifyGeoJSON('japan-raw.geojson', 'japan.geojson', 4);
```

```bash
# 실행
node scripts/simplify-geojson.js
```

### 2. Topology 단순화 (mapshaper)

```bash
# mapshaper 설치
npm install -g mapshaper

# 단순화 (10% 유지)
mapshaper japan-raw.geojson \
  -simplify 10% \
  -o japan-simplified.geojson

# 더 공격적인 단순화 (5% 유지)
mapshaper japan-raw.geojson \
  -simplify 5% keep-shapes \
  -o japan-simple.geojson
```

### 3. 속성 정리

불필요한 속성 제거:

```javascript
// scripts/clean-properties.js
import fs from 'fs';

function cleanProperties(inputPath, outputPath, keepProps) {
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  data.features = data.features.map(feature => ({
    ...feature,
    properties: Object.fromEntries(
      Object.entries(feature.properties)
        .filter(([key]) => keepProps.includes(key))
    ),
  }));

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

// 사용
cleanProperties(
  'japan-raw.geojson',
  'japan-clean.geojson',
  ['id', 'name', 'name_ja', 'name_ko', 'name_en']
);
```

### 4. 압축

최종 파일을 gzip으로 압축:

```bash
gzip -k japan.geojson
# → japan.geojson.gz 생성
```

Vite는 자동으로 `.gz` 파일을 제공합니다.

---

## 지역 메타데이터 생성

### 1. 다국어 지역명 매핑

```typescript
// packages/geojson/src/regions-metadata.ts

export interface RegionMetadata {
  id: string;           // ISO 3166-2 코드
  countryCode: string;  // 국가 코드
  name: string;         // 기본 이름 (현지어)
  nameEn: string;       // 영문명
  nameKo: string;       // 한글명
  nameJa?: string;      // 일본어명 (일본만)
  category?: string;    // 지역 분류
  population?: number;  // 인구 (선택)
  area?: number;        // 면적 km² (선택)
}

export const JAPAN_METADATA: Record<string, RegionMetadata> = {
  'JP-01': {
    id: 'JP-01',
    countryCode: 'JP',
    name: '北海道',
    nameEn: 'Hokkaido',
    nameKo: '홋카이도',
    nameJa: '北海道',
    category: 'hokkaido',
    population: 5250000,
    area: 83424,
  },
  'JP-13': {
    id: 'JP-13',
    countryCode: 'JP',
    name: '東京都',
    nameEn: 'Tokyo',
    nameKo: '도쿄도',
    nameJa: '東京都',
    category: 'kanto',
    population: 14000000,
    area: 2194,
  },
  // ... 47개
};

export const KOREA_METADATA: Record<string, RegionMetadata> = {
  'KR-11': {
    id: 'KR-11',
    countryCode: 'KR',
    name: '서울특별시',
    nameEn: 'Seoul',
    nameKo: '서울특별시',
    category: 'capital',
    population: 9700000,
    area: 605,
  },
  // ... 17개
};
```

### 2. 지역 분류 (카테고리)

```typescript
// 일본 지역 구분 (8개 권역)
export const JAPAN_CATEGORIES = {
  hokkaido: ['JP-01'],
  tohoku: ['JP-02', 'JP-03', 'JP-04', 'JP-05', 'JP-06', 'JP-07'],
  kanto: ['JP-08', 'JP-09', 'JP-10', 'JP-11', 'JP-12', 'JP-13', 'JP-14'],
  chubu: ['JP-15', 'JP-16', 'JP-17', 'JP-18', 'JP-19', 'JP-20', 'JP-21', 'JP-22', 'JP-23'],
  kansai: ['JP-24', 'JP-25', 'JP-26', 'JP-27', 'JP-28', 'JP-29', 'JP-30'],
  chugoku: ['JP-31', 'JP-32', 'JP-33', 'JP-34', 'JP-35'],
  shikoku: ['JP-36', 'JP-37', 'JP-38', 'JP-39'],
  kyushu: ['JP-40', 'JP-41', 'JP-42', 'JP-43', 'JP-44', 'JP-45', 'JP-46', 'JP-47'],
};

// 한국 지역 구분
export const KOREA_CATEGORIES = {
  capital: ['KR-11'],
  metropolitan: ['KR-26', 'KR-27', 'KR-28', 'KR-29', 'KR-30', 'KR-31'],
  special: ['KR-50', 'KR-49'],
  province: ['KR-41', 'KR-42', 'KR-43', 'KR-44', 'KR-45', 'KR-46', 'KR-47', 'KR-48'],
};
```

---

## GeoJSON 파일 구조

### 최종 파일 구조

```
packages/geojson/
├── data/
│   ├── japan/
│   │   ├── japan.geojson          # 원본
│   │   ├── japan-simple.geojson   # 단순화 (웹용)
│   │   └── japan-simple.geojson.gz
│   ├── korea/
│   │   ├── korea.geojson
│   │   ├── korea-simple.geojson
│   │   └── korea-simple.geojson.gz
│   └── world/                      # v2.0+
├── src/
│   ├── metadata/
│   │   ├── japan.ts
│   │   ├── korea.ts
│   │   └── index.ts
│   └── index.ts
├── scripts/
│   ├── download.ts                 # 데이터 다운로드
│   ├── process.ts                  # 처리 및 최적화
│   └── validate.ts                 # 검증
└── package.json
```

### 데이터 로더 구현

```typescript
// packages/geojson/src/index.ts

export async function loadGeoJSON(country: 'japan' | 'korea') {
  const path = `/geojson/${country}/${country}-simple.geojson`;
  const response = await fetch(path);
  return response.json();
}

export { JAPAN_METADATA, KOREA_METADATA } from './metadata';
```

---

## 검증 및 테스트

### 1. GeoJSON 유효성 검사

```bash
# geojsonhint 설치
npm install -g @mapbox/geojsonhint

# 검증
geojsonhint japan.geojson
```

### 2. 시각적 확인

온라인 도구:
- http://geojson.io/ - 가장 간단
- https://mapshaper.org/ - 편집 가능

### 3. 자동화 스크립트

```javascript
// scripts/validate.js
import fs from 'fs';
import geojsonhint from '@mapbox/geojsonhint';

function validateGeoJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  const errors = geojsonhint.hint(data);

  if (errors.length === 0) {
    console.log(`✓ ${filePath} is valid`);
    return true;
  } else {
    console.error(`✗ ${filePath} has errors:`);
    errors.forEach(err => console.error(`  - ${err.message}`));
    return false;
  }
}

// 모든 파일 검증
const files = [
  'data/japan/japan-simple.geojson',
  'data/korea/korea-simple.geojson',
];

const allValid = files.every(validateGeoJSON);
process.exit(allValid ? 0 : 1);
```

### 4. 통계 확인

```javascript
// scripts/stats.js
import fs from 'fs';

function getStats(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const features = data.features;

  console.log(`\nStats for ${filePath}:`);
  console.log(`  Features: ${features.length}`);
  console.log(`  File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);

  // 좌표 수 계산
  let totalCoords = 0;
  features.forEach(f => {
    const countCoords = (coords) => {
      if (typeof coords[0] === 'number') return 1;
      return coords.reduce((sum, c) => sum + countCoords(c), 0);
    };
    totalCoords += countCoords(f.geometry.coordinates);
  });

  console.log(`  Total coordinates: ${totalCoords}`);
  console.log(`  Avg coords per feature: ${(totalCoords / features.length).toFixed(0)}`);
}

getStats('data/japan/japan-simple.geojson');
getStats('data/korea/korea-simple.geojson');
```

---

## japan-regions.json 예시

```json
{
  "JP-01": { "name": "北海道", "en": "Hokkaido", "ko": "홋카이도", "category": "hokkaido" },
  "JP-02": { "name": "青森県", "en": "Aomori", "ko": "아오모리현", "category": "tohoku" },
  "JP-03": { "name": "岩手県", "en": "Iwate", "ko": "이와테현", "category": "tohoku" },
  "JP-04": { "name": "宮城県", "en": "Miyagi", "ko": "미야기현", "category": "tohoku" },
  "JP-05": { "name": "秋田県", "en": "Akita", "ko": "아키타현", "category": "tohoku" },
  "JP-06": { "name": "山形県", "en": "Yamagata", "ko": "야마가타현", "category": "tohoku" },
  "JP-07": { "name": "福島県", "en": "Fukushima", "ko": "후쿠시마현", "category": "tohoku" },
  "JP-08": { "name": "茨城県", "en": "Ibaraki", "ko": "이바라키현", "category": "kanto" },
  "JP-09": { "name": "栃木県", "en": "Tochigi", "ko": "도치기현", "category": "kanto" },
  "JP-10": { "name": "群馬県", "en": "Gunma", "ko": "군마현", "category": "kanto" },
  "JP-11": { "name": "埼玉県", "en": "Saitama", "ko": "사이타마현", "category": "kanto" },
  "JP-12": { "name": "千葉県", "en": "Chiba", "ko": "지바현", "category": "kanto" },
  "JP-13": { "name": "東京都", "en": "Tokyo", "ko": "도쿄도", "category": "kanto" },
  "JP-14": { "name": "神奈川県", "en": "Kanagawa", "ko": "가나가와현", "category": "kanto" },
  "JP-15": { "name": "新潟県", "en": "Niigata", "ko": "니가타현", "category": "chubu" },
  "JP-16": { "name": "富山県", "en": "Toyama", "ko": "도야마현", "category": "chubu" },
  "JP-17": { "name": "石川県", "en": "Ishikawa", "ko": "이시카와현", "category": "chubu" },
  "JP-18": { "name": "福井県", "en": "Fukui", "ko": "후쿠이현", "category": "chubu" },
  "JP-19": { "name": "山梨県", "en": "Yamanashi", "ko": "야마나시현", "category": "chubu" },
  "JP-20": { "name": "長野県", "en": "Nagano", "ko": "나가노현", "category": "chubu" },
  "JP-21": { "name": "岐阜県", "en": "Gifu", "ko": "기후현", "category": "chubu" },
  "JP-22": { "name": "静岡県", "en": "Shizuoka", "ko": "시즈오카현", "category": "chubu" },
  "JP-23": { "name": "愛知県", "en": "Aichi", "ko": "아이치현", "category": "chubu" },
  "JP-24": { "name": "三重県", "en": "Mie", "ko": "미에현", "category": "kansai" },
  "JP-25": { "name": "滋賀県", "en": "Shiga", "ko": "시가현", "category": "kansai" },
  "JP-26": { "name": "京都府", "en": "Kyoto", "ko": "교토부", "category": "kansai" },
  "JP-27": { "name": "大阪府", "en": "Osaka", "ko": "오사카부", "category": "kansai" },
  "JP-28": { "name": "兵庫県", "en": "Hyogo", "ko": "효고현", "category": "kansai" },
  "JP-29": { "name": "奈良県", "en": "Nara", "ko": "나라현", "category": "kansai" },
  "JP-30": { "name": "和歌山県", "en": "Wakayama", "ko": "와카야마현", "category": "kansai" },
  "JP-31": { "name": "鳥取県", "en": "Tottori", "ko": "돗토리현", "category": "chugoku" },
  "JP-32": { "name": "島根県", "en": "Shimane", "ko": "시마네현", "category": "chugoku" },
  "JP-33": { "name": "岡山県", "en": "Okayama", "ko": "오카야마현", "category": "chugoku" },
  "JP-34": { "name": "広島県", "en": "Hiroshima", "ko": "히로시마현", "category": "chugoku" },
  "JP-35": { "name": "山口県", "en": "Yamaguchi", "ko": "야마구치현", "category": "chugoku" },
  "JP-36": { "name": "徳島県", "en": "Tokushima", "ko": "도쿠시마현", "category": "shikoku" },
  "JP-37": { "name": "香川県", "en": "Kagawa", "ko": "가가와현", "category": "shikoku" },
  "JP-38": { "name": "愛媛県", "en": "Ehime", "ko": "에히메현", "category": "shikoku" },
  "JP-39": { "name": "高知県", "en": "Kochi", "ko": "고치현", "category": "shikoku" },
  "JP-40": { "name": "福岡県", "en": "Fukuoka", "ko": "후쿠오카현", "category": "kyushu" },
  "JP-41": { "name": "佐賀県", "en": "Saga", "ko": "사가현", "category": "kyushu" },
  "JP-42": { "name": "長崎県", "en": "Nagasaki", "ko": "나가사키현", "category": "kyushu" },
  "JP-43": { "name": "熊本県", "en": "Kumamoto", "ko": "구마모토현", "category": "kyushu" },
  "JP-44": { "name": "大分県", "en": "Oita", "ko": "오이타현", "category": "kyushu" },
  "JP-45": { "name": "宮崎県", "en": "Miyazaki", "ko": "미야자키현", "category": "kyushu" },
  "JP-46": { "name": "鹿児島県", "en": "Kagoshima", "ko": "가고시마현", "category": "kyushu" },
  "JP-47": { "name": "沖縄県", "en": "Okinawa", "ko": "오키나와현", "category": "kyushu" }
}
```

---

## 자동화 워크플로우

### package.json scripts

```json
{
  "scripts": {
    "data:download": "node scripts/download.js",
    "data:process": "node scripts/process.js",
    "data:validate": "node scripts/validate.js",
    "data:stats": "node scripts/stats.js",
    "data:all": "pnpm data:download && pnpm data:process && pnpm data:validate && pnpm data:stats"
  }
}
```

### 전체 워크플로우

```bash
# 1. 데이터 다운로드
pnpm data:download

# 2. 처리 및 최적화
pnpm data:process

# 3. 검증
pnpm data:validate

# 4. 통계 확인
pnpm data:stats

# 또는 한 번에
pnpm data:all
```

---

## 다음 단계

GeoJSON 데이터가 준비되면:

1. [컴포넌트 구현 가이드](./COMPONENT_GUIDE.md)를 참고하여 지도 컴포넌트 개발
2. Leaflet과 통합하여 시각화
3. 인터랙티브 기능 추가

---

**작성일**: 2025-10-28
**참고**: 데이터 라이선스를 반드시 확인하고 준수하세요.
