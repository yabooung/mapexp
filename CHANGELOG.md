# Changelog

All notable changes to this project will be documented in this file.

## [v1.1.0] - 2026-01-20

### Added

- **Map Display Modes**:
  - Added toggle button (Map/Simple) to switch between detailed OpenStreetMap view and a clean, whitespace-only view.
  - **Simple Mode**: Fixed interaction (no zoom/pan) for creating consistent "badge-style" screenshots.
- **Kyung-Hyeon-Do Level Standard**:
  - Implemented new 6-tier level system (0-5).
  - 0: 미답 (Unvisited)
  - 1: 통과 (Passed)
  - 2: 접지 (Landed)
  - 3: 방문 (Visited)
  - 4: 숙박 (Stayed)
  - 5: 거주 (Resided) - Replaced "Master"
- **UI Enhancements**:
  - Updated legends and tooltips to reflect new levels.
  - Added "Crown" icon for Resided level.
  - Made map control UI semi-transparent in Simple Mode.

### Changed

- **Scoring Logic**: Removed complex 8-point rule for Master. Now score equals level (0-5 points).
- **Map Interaction**: clicking a region now cycles through 0-5.
