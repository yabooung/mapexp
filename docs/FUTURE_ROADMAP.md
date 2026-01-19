# Future Upgrade Guide (Phase 4: Detailed Map)

This document outlines the architectural changes required to support sub-administrative districts (e.g., Ward/City level) and drill-down interactions.

## 1. Data Architecture Changes

Currently, we support `prefecture` (Japan) and `province` (Korea). To support sub-regions:

- **Hierarchical IDs**: Structure region IDs as `parent_child`.
  - Example: `tokyo` (Parent) -> `tokyo_shinjuku`, `tokyo_shibuya` (Children).
- **GeoJSON Source**:
  - Need granular GeoJSON files for each prefecture.
  - Source: [National Land Numerical Information](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html) (Japan) or equivalent.
  - **Optimization**: Don't load all at once. Load parent first, then lazy-load children on click.

## 2. Store Logic (`src/store`)

- **Flat vs Nested**:
  - Keep `regions` array flat (`RegionExp[]`).
  - Add `parentId` to `RegionExp` interface to filter by parent.
- **Aggregation**:
  - Parent level (e.g., Tokyo) should automatically calculate its level based on the average/max of its children?
  - OR keep them independent (User sets Tokyo level separately from Shinjuku). -> _Recommendation: Independent for flexibility._

## 3. UI/UX Flow

1.  **Map View**:
    - User clicks "Tokyo".
    - Map zooms in to Tokyo bounds.
    - Overlay switches from "Japan Prefectures" to "Tokyo Wards".
    - Breadcrumb appears: `Japan > Tokyo`.
2.  **Breadcrumb Navigation**:
    - Allow users to go back up the hierarchy.

## 4. Automation Pipeline

- **Exif/Timeline Import**:
  - When importing photos, reverse-geocode lat/long to `City/Ward` level.
  - Map this to the `Region ID`.
  - Auto-create `Visit` records.

## 5. Korea Version Re-activation

- Uncomment the Korea button in `src/components/common/CountrySelector.tsx`.
- Verify `korea-provinces.json` is still valid in `public/geojson`.
