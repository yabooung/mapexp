# MAPEXP — 経県値マップ

[한국어](README.md) · [English](README.en.md) · **日本語**

訪れた地域ごとにスタンプを押して、旅の足あとを積み上げる地図サービス。
日本の47都道府県・1,897市区町村と、韓国の16道市・250市郡区に対応しています。

日本の[経県値](https://uub.jp/kkn/)の概念をもとに、市区町村単位の精度とGPSスタンプで再構成しました。

<p align="center">
  <img src="docs/screenshots/desktop.png" width="800" alt="デスクトップ画面">
</p>

<p align="center">
  <img src="docs/screenshots/mobile-map.png" width="240" alt="GPSによる現在地域の検知">
  &nbsp;
  <img src="docs/screenshots/mobile-stats.png" width="240" alt="統計とスタンプ帳">
  &nbsp;
  <img src="docs/screenshots/share-card.png" width="240" alt="共有用画像カード">
</p>

## 主な機能

- **経県値の記録** — 地域をタップするたびにランクが変化：未踏(0) → 通過(1) → 接地(2) → 訪問(3) → 宿泊(4) → 居住(5)
- **GPS** — 現在地域（都道府県＋市区町村）を自動検知、移動ルートの記録、訪問の自動記録
  - GPS認証記録は作成後に日時の編集・削除ができません（手動記録は過去日付を自由に入力可）
- **ゲーム要素** — 旅行者レベル、漢字の落款スタンプ帳（バッジ12種）、レベルアップ演出
- **共有** — 閲覧専用の共有リンク（受け取った人のデータは自動バックアップ）、色分け地図入りのSNS画像カード
- **多言語** — 한국어 · English · 日本語
- **PWA** — ホーム画面への追加、地図データのオフラインキャッシュ
- **プライバシー** — 記録と位置情報はすべて端末内にのみ保存（サーバー・ログインなし）

## 技術スタック

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Leaflet (react-leaflet) · Zustand · Turf.js · d3-geo

## 開発

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 本番ビルド
```

## データ出典

- 日本: [国土数値情報 N03](https://nlftp.mlit.go.jp/ksj/)（加工: [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography)）
- 韓国: 統計庁の行政区域（[southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)）、2026年7月の再編を反映
- 背景タイル: [CARTO](https://carto.com/attributions) / [OpenStreetMap](https://www.openstreetmap.org/copyright)

「経県値Ⓡ」の概念元は[都道府県市区町村 (uub.jp)](https://uub.jp/kkn/) です。経県値は uub.jp の登録商標です。
