# 지도 기능 사용 가이드

## 🗺️ 지도 기능 구현 완료

지도를 클릭하여 지역을 기록할 수 있는 기능이 추가되었습니다!

## 주요 기능

### 1. **지도 보기 / 리스트 보기**
- 메인 페이지에서 "🗺️ 지도 보기"와 "📋 리스트 보기" 버튼으로 전환 가능
- 지도 뷰에서는 일본/한국 지도를 시각적으로 확인

### 2. **지도 클릭으로 기록**
- 지도에서 원하는 지역을 클릭하면 바로 모달이 열림
- 레벨 선택, 방문일, 메모 등을 입력하여 기록

### 3. **레벨별 색상 표시**
- **Lv.0 (미방문)**: 회색
- **Lv.1 (통과)**: 연노랑
- **Lv.2 (정차)**: 노랑
- **Lv.3 (방문)**: 주황
- **Lv.4 (거주)**: 빨강
- **Lv.5 (마스터)** ⭐: 금색 + 굵은 테두리

### 4. **호버 툴팁**
- 지도에 마우스를 올리면 지역명이 툴팁으로 표시
- 호버 시 하이라이트 효과

### 5. **국가 전환**
- 일본(🇯🇵) / 한국(🇰🇷) 전환 시 자동으로 지도 업데이트
- 각 국가에 맞는 중심점과 줌 레벨 자동 설정

---

## ⚠️ 중요: 전체 GeoJSON 데이터로 교체하기

현재는 **샘플 GeoJSON** 데이터를 사용하고 있습니다 (일본 5개, 한국 4개 지역만 포함).

전체 47개 도도부현과 17개 시도 데이터를 사용하려면 아래 단계를 따르세요.

### 1단계: GeoJSON 데이터 다운로드

#### 일본 (47개 도도부현)
```bash
# GitHub에서 다운로드
curl -o public/geojson/japan-prefectures.json \
  https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/prefectures.geojson
```

또는 다음 사이트에서 수동 다운로드:
- https://github.com/dataofjapan/land
- https://github.com/piuccio/open-data-jp-prefectures-geojson

#### 한국 (17개 시도)
```bash
# GitHub에서 다운로드
curl -o public/geojson/korea-provinces.json \
  https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-provinces-geo.json
```

### 2단계: GeoJSON 속성 매핑 확인

다운로드한 GeoJSON의 properties가 다음 형식과 일치하는지 확인:

```json
{
  "type": "Feature",
  "properties": {
    "id": "tokyo",        // 지역 ID (regions.ts의 id와 일치해야 함)
    "name": "東京都",      // 현지어 이름
    "name_en": "Tokyo",   // 영어 이름
    "name_ko": "도쿄"      // 한국어 이름
  },
  "geometry": { ... }
}
```

**중요**: `id` 필드가 `src/data/regions.ts`의 지역 ID와 정확히 일치해야 합니다!

### 3단계: MapView 컴포넌트 수정

`src/components/map/MapView.tsx` 파일의 24-26번째 줄을 수정:

```typescript
// 수정 전 (샘플)
const fileName =
  country === 'japan'
    ? 'japan-prefectures-sample.json'
    : 'korea-provinces-sample.json'

// 수정 후 (전체 데이터)
const fileName =
  country === 'japan'
    ? 'japan-prefectures.json'
    : 'korea-provinces.json'
```

### 4단계: properties 매핑 조정 (필요시)

다운로드한 GeoJSON의 속성명이 다를 경우, MapView.tsx의 77번째 줄 수정:

```typescript
// 예시: 한국어 이름 필드가 'name_kr'인 경우
const regionName = feature.properties.name_kr || feature.properties.name
```

---

## 📁 파일 구조

```
mapexp/
├── public/
│   └── geojson/
│       ├── japan-prefectures-sample.json    # 샘플 (5개)
│       ├── korea-provinces-sample.json      # 샘플 (4개)
│       ├── japan-prefectures.json           # 전체 (47개) - 추가 필요
│       └── korea-provinces.json             # 전체 (17개) - 추가 필요
├── src/
│   ├── components/
│   │   └── map/
│   │       └── MapView.tsx                  # 지도 컴포넌트
│   └── data/
│       └── regions.ts                       # 지역 메타데이터
```

---

## 🛠️ 개발 가이드

### 지도 스타일 커스터마이징

`src/components/map/MapView.tsx`의 `getRegionStyle` 함수 수정:

```typescript
const getRegionStyle = (feature?: Feature): PathOptions => {
  // fillColor: 채우기 색상
  // fillOpacity: 투명도 (0-1)
  // color: 테두리 색상
  // weight: 테두리 두께
}
```

### 지도 중심 및 줌 변경

`src/components/map/MapView.tsx`의 103-104번째 줄:

```typescript
const mapCenter = country === 'japan' ? [37.5, 138.5] : [36.5, 127.5]
const mapZoom = country === 'japan' ? 5 : 7
```

### 툴팁 스타일 변경

`app/globals.css`의 `.region-tooltip` 클래스:

```css
.region-tooltip {
  background-color: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
  /* ... */
}
```

---

## 🎯 다음 단계

1. **전체 GeoJSON 데이터 통합**: 위 가이드대로 47개 도도부현, 17개 시도 데이터로 교체
2. **성능 최적화**: GeoJSON 단순화 (Mapshaper 사용)
3. **추가 기능**:
   - 줌 레벨에 따라 지역명 표시/숨김
   - 레벨별 필터링
   - 지도 범례 추가

---

## ❓ 문제 해결

### 지도가 표시되지 않는 경우
1. 브라우저 콘솔 확인 (F12)
2. GeoJSON 파일이 올바른 위치에 있는지 확인
3. GeoJSON 형식이 유효한지 확인 (https://geojson.io)

### 클릭이 작동하지 않는 경우
- `properties.id`가 `regions.ts`의 지역 ID와 일치하는지 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 색상이 제대로 표시되지 않는 경우
- `src/constants/colors.ts`의 색상 코드 확인
- 레벨별 색상 매핑 확인

---

**참고**: 샘플 GeoJSON은 테스트용으로 간단한 사각형 경계만 포함하고 있습니다. 정확한 지도를 보려면 실제 GeoJSON 데이터로 교체하세요.
