# MAPEXP — My Travel Stamps

[한국어](README.md) · **English** · [日本語](README.ja.md)

A map that stamps every region you've traveled to, building up your travel footprint.
Covers Japan's 47 prefectures & 1,897 municipalities and Korea's 16 provinces & 250 municipalities.

Based on Japan's [経県値 (Keikenchi)](https://uub.jp/kkn/) concept, reimagined with municipality-level precision and GPS stamping.

<p align="center">
  <img src="docs/screenshots/desktop.en.png" width="800" alt="Japan map view">
</p>
<p align="center">
  <img src="docs/screenshots/desktop-korea.en.png" width="800" alt="Korea map view">
</p>

<p align="center">
  <img src="docs/screenshots/mobile-map.en.png" width="240" alt="GPS region detection">
  &nbsp;
  <img src="docs/screenshots/mobile-stats.en.png" width="240" alt="Stats & stamp book">
  &nbsp;
  <img src="docs/screenshots/share-card.en.png" width="240" alt="Shareable image card">
</p>

## Features

- **Stamp records** — Tap a region to cycle its grade: Unvisited(0) → Passed(1) → Landed(2) → Visited(3) → Stayed(4) → Lived(5)
- **GPS** — Auto-detects your current region (province + municipality), records travel tracks, auto-logs visits
  - GPS-verified records can't be edited or deleted; manual records allow free past-date entry
- **Gamification** — Traveler level, kanji seal stamp book (12 badges), level-up animation
- **Sharing** — Read-only share links (recipient's data auto-backed up), SNS image card with your colored map
- **i18n** — Korean · English · Japanese
- **PWA** — Home-screen install, offline map caching
- **Privacy** — All records and location data stay in your browser only (no server, no login)

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Leaflet (react-leaflet) · Zustand · Turf.js · d3-geo

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
```

## Data Sources

- Japan: [国土数値情報 N03](https://nlftp.mlit.go.jp/ksj/) (processed by [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography))
- Korea: KOSTAT administrative boundaries ([southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)), reflecting the 2026-07 reorganization
- Base tiles: [CARTO](https://carto.com/attributions) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

The 経県値Ⓡ (Keikenchi) concept originates from [都道府県市区町村 (uub.jp)](https://uub.jp/kkn/). 経県値 is a registered trademark of uub.jp.
