import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { detectCountryRegionAt, detectMunicipalityAt, type Country, type DetectedRegion } from '@/lib/geo'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import { getRegionMetadata } from '@/data/regions'
import { regionDisplayName, type Lang, type I18nKey } from '@/lib/i18n'
import { GyeongHyeonChi } from '@/types'

/**
 * "현재 위치 도장" 원샷 감지·기록.
 *
 * getCurrentPosition 1회 → 좌표로 국가·광역·기초 지역 감지 → 해당 국가로 자동 전환 →
 * 감지된 지역(기초 우선)에 GPS 인증 '접지(2)' 도장. 연속 추적(watchPosition) 없이 동작한다.
 * 두 나라 밖이면 reason: 'outside'로 반환(기록하지 않음).
 */

export type LocateResult =
  | { ok: true; country: Country; region: DetectedRegion; muni: DetectedRegion | null; targetId: string; label: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'outside' | 'error' }

/**
 * 실패 사유 → 토스트 메시지 키/종류. 지도 버튼·시정촌 모달 두 진입점이 공유한다.
 * (outside만 안내 토스트, 나머지는 error 토스트)
 */
export function locateFailToast(reason: Extract<LocateResult, { ok: false }>['reason']): {
  key: I18nKey
  error: boolean
} {
  switch (reason) {
    case 'denied':
      return { key: 'gps.denied', error: true }
    case 'unsupported':
      return { key: 'gps.notSupported', error: true }
    case 'outside':
      return { key: 'gps.outside', error: false }
    default:
      return { key: 'gps.locateError', error: true }
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 10000,
    })
  })
}

export async function locateStamp(lang: Lang): Promise<LocateResult> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }

  let pos: GeolocationPosition
  try {
    pos = await getPosition()
  } catch (err) {
    const code = (err as GeolocationPositionError | undefined)?.code
    if (code === 1 /* PERMISSION_DENIED */) return { ok: false, reason: 'denied' }
    return { ok: false, reason: 'error' }
  }

  const { latitude: lat, longitude: lng } = pos.coords
  const found = await detectCountryRegionAt(lat, lng)
  if (!found) return { ok: false, reason: 'outside' }

  const { country, region } = found
  if (country === 'japan') loadJpMuniNames() // 지명 사전 워밍 (아래 detectMunicipalityAt와 병렬)

  // 감지된 국가로 자동 전환 (앱이 다른 나라를 보고 있어도 현재 위치 나라로 맞춘다)
  const store = useMapExpStore.getState()
  if (store.country !== country) store.setCountry(country)

  const muni = await detectMunicipalityAt(lat, lng, region.id, country)
  const targetId = muni ? muni.id : region.id

  // GPS 인증 도장 (접지) — source='gps'라 이후 수정/삭제 불가
  useMapExpStore.getState().addGpsRecord(targetId, GyeongHyeonChi.LANDED)

  // 현재 위치 상태 반영 (배너·후속 표시용)
  const gps = useGpsStore.getState()
  gps.setPosition({
    lat,
    lng,
    accuracy: pos.coords.accuracy,
    heading: pos.coords.heading,
    timestamp: pos.timestamp,
  })
  gps.setCurrentRegion(region.id, region.name)
  gps.setCurrentMuni(muni?.id ?? null, muni?.name ?? null, muni?.props ?? null)

  // 라벨을 현지화하기 전에 일본 지명 사전 로드를 보장 (위에서 warm시작한 promise를 await — 중복 fetch 없음)
  if (country === 'japan') await loadJpMuniNames()
  const meta = getRegionMetadata(region.id)
  const prefName = meta ? regionDisplayName(meta, lang) : region.name
  const label = muni
    ? `${prefName} · ${muniDisplayName(country, muni.props, muni.name, lang)}`
    : prefName

  return { ok: true, country, region, muni, targetId, label }
}
