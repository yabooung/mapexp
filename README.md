# MAPEXP — 나의 경현치 지도

방문한 지역을 기록하고 경험치(経県値)를 쌓는 지도 서비스.
일본 47개 도도부현·1,897개 시정촌과 한국 16개 시도·250개 시군구를 지원합니다.

## 주요 기능

- **경현치 기록**: 지역을 탭할 때마다 미답(0) → 통과(1) → 접지(2) → 방문(3) → 숙박(4) → 거주(5) 순환
- **GPS**: 현재 지역(광역+기초 동시) 자동 감지, 이동 경로 트랙 기록, 자동 방문 감지
  - GPS 인증 기록은 생성 후 시간 수정·삭제 불가 (수동 기록은 과거 날짜 자유 입력)
- **게임화**: 여행자 레벨, 한자 낙관 도장첩(뱃지 12종), 레벨업 연출
- **공유**: 읽기 전용 공유 링크(LZ 압축 URL), SNS용 이미지 카드 저장
- **다국어**: 한국어 · English · 日本語
- **PWA**: 홈 화면 설치, 오프라인 지도 데이터 캐싱
- **프라이버시**: 모든 기록과 위치 정보는 사용자 브라우저(localStorage)에만 저장 — 서버 없음

## 기술 스택

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Leaflet(react-leaflet) · Zustand · Turf.js

## 개발

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 프로덕션 빌드
```

## 지도 데이터 출처

- 일본: [国土数値情報 N03](https://nlftp.mlit.go.jp/ksj/) (가공: [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography))
- 한국: 통계청 행정구역 ([southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)), 2026-07 행정구역 개편(전남광주통합특별시, 군위군 대구 편입) 반영
- 배경 타일: [CARTO](https://carto.com/attributions) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

'경현치'는 일본의 [経県値](https://ja.wikipedia.org/wiki/%E7%B5%8C%E7%9C%8C%E5%80%A4) 개념을 바탕으로 합니다.
