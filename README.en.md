# MAPEXP — My Travel Stamps

[한국어](README.md) · **English** · [日本語](README.ja.md)

**▶ https://mapexp.vercel.app — no install, works right away**

A map that stamps every region you've traveled to, building up your travel footprint.
Records Japan's 47 prefectures & 1,897 municipalities and Korea's 16 provinces & 250 municipalities — **on one map**.

Based on Japan's [経県値 (Keikenchi)](https://uub.jp/kkn/) concept, reimagined with dual-country recording, municipality-level precision, and GPS stamping. The map uses the original Keikenchi standard color palette.

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

- **Stamp records** — Tap a region to cycle its grade: Unvisited(0) → Passed(1) → Landed(2) → Visited(3) → Stayed(4) → Lived(5). Mis-taps can be undone from a toast; long-press opens details (memos, visit log)
- **Dual-country view** — Show Japan and Korea on one screen with per-country stats (your traveler level follows the country you're viewing)
- **Municipality level** — Stamp individual municipalities in the stamping view (list or mini-map); a "Municipalities" toggle renders the whole country at municipal detail
- **Place names in 3 languages** — Japanese municipalities in Hangul and romaji (from official MIC readings), Korean municipalities in kanji + katakana. Map place-name language is selectable independently of the UI language
- **GPS location stamp** — One tap detects the region you're currently in (province + municipality) and stamps it, auto-recognizing which country you're in
  - GPS-verified records can't be edited or deleted; manual records allow free past-date entry
- **Gamification** — Per-country traveler level, kanji seal stamp book — milestone stamps plus **region-completion stamps** (earned by stamping every municipality of a province, or completing a regional block like Shikoku or Jeolla; shown in indigo blue), per-region and municipal score breakdowns
- **Sharing** — SNS image card (game-style Lv/EXP score, rank tier, optional place-name labels and badge row, Japan/Korea/both × regions/municipalities), per-region card with share preview, QR codes, read-only share links, JSON file exchange. Overlay a friend's map on yours in a 3-color compare view (only me / only them / both)
- **i18n UI** — Korean · English · Japanese
- **PWA** — Home-screen install, offline map caching
- **Privacy** — All records and location data stay in your browser only (no server, no login)

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Leaflet (react-leaflet) · Zustand · Turf.js · d3-geo

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build

# Regenerate localized Japanese municipality names (public/geojson/jp-muni-names.json)
node scripts/gen-muni-names.mjs
```

## Data Sources

- Japan: [国土数値情報 N03](https://nlftp.mlit.go.jp/ksj/) (processed by [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography)); municipality readings from the MIC local government codes ([nojimage/local-gov-code-jp](https://github.com/nojimage/local-gov-code-jp))
- Korea: KOSTAT administrative boundaries ([southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)), reflecting the 2026-07 reorganization
- Base tiles: [CARTO](https://carto.com/attributions) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

The 経県値Ⓡ (Keikenchi) concept originates from [都道府県市区町村 (uub.jp)](https://uub.jp/kkn/). 経県値 is a registered trademark of uub.jp.

## License

- **Code**: [MIT](LICENSE) © 2026 yabooung
- **Map data**: covered by the licenses of the respective sources listed under "Data sources" (Japan MLIT KSJ terms, Korea KOSTAT / southkorea-maps, MIC codes, etc.). Check the original terms before reusing the bundled GeoJSON.
- **経県値Ⓡ** is a registered trademark of uub.jp; this project makes only nominative/reference use of the concept with attribution.
