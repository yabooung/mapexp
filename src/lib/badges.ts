import { RegionExp, GyeongHyeonChi, ExperienceGrade, RegionMetadata } from '@/types'
import { isRegionOfCountry, isHiddenRegion } from '@/constants/regions'
import { MUNI_COUNT_BY_PREF } from '@/constants/muniCounts'
import { ENABLE_GPS_TRACKING } from '@/constants'
import { getRegionMetadata } from '@/data/regions'
import { regionDisplayName, type Lang } from '@/lib/i18n'

/**
 * 뱃지(업적) 시스템
 */

/**
 * 광역 완주 도장에 새길 한자.
 * 기본은 현지명(일본)·일본어표기(한국)의 첫 한자 1자.
 * 단, 첫 글자가 국가 내에서 겹쳐 구분이 안 되는 광역은 2자로 새겨 식별 가능하게 한다.
 * (예: 大阪/大分, 山形/山口/山梨, 福島/福井/福岡, 忠北/忠南, 慶北/慶南, 全北/全南 …)
 */
const SEAL_CHAR_OVERRIDE: Record<string, string> = {
  // 일본 — 첫 글자 충돌 광역
  yamagata: '山形', yamanashi: '山梨', yamaguchi: '山口',
  fukushima: '福島', fukui: '福井', fukuoka: '福岡',
  miyagi: '宮城', miyazaki: '宮崎',
  nagano: '長野', nagasaki: '長崎',
  aichi: '愛知', ehime: '愛媛',
  osaka: '大阪', oita: '大分',
  // 한국 — 서울은 한자 없음→漢(漢陽), 나머지는 忠/慶/全/大 계열 충돌 해소
  seoul: '漢',
  daegu: '大邱', daejeon: '大田',
  chungbuk: '忠北', chungnam: '忠南',
  gyeongbuk: '慶北', gyeongnam: '慶南',
  jeonbuk: '全北', jeonnamgwangju: '全南',
}
const sealChar = (meta: RegionMetadata): string => {
  const override = SEAL_CHAR_OVERRIDE[meta.id]
  if (override) return override
  if (meta.country === 'japan') return meta.nameLocal.slice(0, 1)
  return (meta.nameJa || meta.name).slice(0, 1)
}

/** 광역 완주 도장 이름/설명 (언어별) */
const COMPLETE_LABEL: Record<Lang, { suffix: string; desc: (n: string) => string }> = {
  ko: { suffix: '완주', desc: (n) => `${n}의 모든 기초 지역 방문` },
  en: { suffix: 'Complete', desc: (n) => `Visit every municipality in ${n}` },
  ja: { suffix: '制覇', desc: (n) => `${n}のすべての市区町村を訪問` },
}

export interface Badge {
  id: string
  /** 낙관 도장에 새길 글자 (1~2자) */
  icon: string
  name: string
  description: string
  /** 진행도 (0~1) - 잠금 뱃지에 표시 */
  progress: number
  achieved: boolean
  /** 도장 종류 — 'region'(지역 완주, 藍 파랑) / 'milestone'(그 외, 인주 레드) */
  kind: 'region' | 'milestone'
}

const KANSAI_IDS = ['osaka', 'kyoto', 'hyogo', 'nara', 'wakayama', 'shiga']
const KANTO_IDS = ['tokyo', 'kanagawa', 'saitama', 'chiba', 'ibaraki', 'tochigi', 'gunma']
const KYUSHU_IDS = ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa']
const SHIKOKU_IDS = ['tokushima', 'kagawa', 'ehime', 'kochi']
// 한국 권역 (일본 탭의 간사이/간토/규슈에 대응 - 지역 뱃지는 보고 있는 국가 것만 표시)
const K_CAPITAL_IDS = ['seoul', 'incheon', 'gyeonggi']
const K_CHUNGCHEONG_IDS = ['daejeon', 'sejong', 'chungbuk', 'chungnam']
const K_GYEONGSANG_IDS = ['busan', 'daegu', 'ulsan', 'gyeongbuk', 'gyeongnam']
// 전라(호남): 2026-07 전남·광주 통합으로 전북 + 전남광주통합 2개
const K_JEOLLA_IDS = ['jeonbuk', 'jeonnamgwangju']

const levelOf = (r: RegionExp): ExperienceGrade =>
  r.gyeonghyeonchi ?? (r.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

const visitedIn = (regions: RegionExp[], ids: string[]) =>
  ids.filter((id) => {
    const r = regions.find((reg) => reg.regionId === id)
    return r && levelOf(r) > GyeongHyeonChi.UNVISITED
  }).length

/**
 * 현재 기록 기준 뱃지 목록 계산
 * @param regions 지역 기록
 * @param totalRegions 전체 지역 수 (달성률용)
 * @param trackKm 누적 이동 거리 (km)
 */
export function computeBadges(
  regions: RegionExp[],
  totalRegions: number,
  trackKm: number,
  country: 'japan' | 'korea' = 'japan',
  lang: Lang = 'ko',
): Badge[] {
  // 현재 국가의 광역 지역 기록만 집계 (시정촌/시군구 기록 제외)
  const prefRegions = regions.filter(
    (r) => !r.regionId.includes('_') && isRegionOfCountry(r.regionId, country) && !isHiddenRegion(r.regionId),
  )
  const visitedCount = prefRegions.filter((r) => levelOf(r) > GyeongHyeonChi.UNVISITED).length
  const masterCount = prefRegions.filter((r) => levelOf(r) === GyeongHyeonChi.RESIDED).length
  const stayedCount = prefRegions.filter((r) => levelOf(r) >= GyeongHyeonChi.STAYED).length
  const completionRate = totalRegions > 0 ? visitedCount / totalRegions : 0

  // 기초 지역(시정촌/시군구) 기록 수 - 현재 국가 기준
  const muniCount = regions.filter(
    (r) =>
      r.regionId.includes('_') &&
      isRegionOfCountry(r.regionId, country) &&
      !isHiddenRegion(r.regionId) &&
      levelOf(r) > GyeongHyeonChi.UNVISITED,
  ).length

  // 양국 기록 여부 - 이 뱃지만은 보고 있는 국가와 무관하게 전체 기록으로 판정
  const hasCountry = (c: 'japan' | 'korea') =>
    regions.some(
      (r) =>
        !r.regionId.includes('_') &&
        isRegionOfCountry(r.regionId, c) &&
        !isHiddenRegion(r.regionId) &&
        levelOf(r) > GyeongHyeonChi.UNVISITED,
    )
  const bothCountries = (hasCountry('japan') ? 1 : 0) + (hasCountry('korea') ? 1 : 0)

  const make = (
    id: string,
    icon: string,
    name: string,
    description: string,
    current: number,
    target: number,
    kind: Badge['kind'] = 'milestone',
  ): Badge => ({
    id,
    icon,
    name,
    description,
    progress: Math.min(1, target > 0 ? current / target : 0),
    achieved: current >= target,
    kind,
  })

  // 지역 뱃지는 보고 있는 국가 것만 (반대 국가 뱃지는 그 국가 기록으로만 진행 가능해
  //  같이 보여주면 영원히 0%로 남아 혼란)
  const regionalBadges =
    country === 'japan'
      ? [
          make('kansai-king', '関西', '간사이 킹', '간사이 6개 지역 모두 방문하기', visitedIn(prefRegions, KANSAI_IDS), KANSAI_IDS.length, 'region'),
          make('kanto-master', '関東', '간토 마스터', '간토 7개 지역 모두 방문하기', visitedIn(prefRegions, KANTO_IDS), KANTO_IDS.length, 'region'),
          make('kyushu-explorer', '九州', '규슈 탐험가', '규슈·오키나와 8개 지역 모두 방문하기', visitedIn(prefRegions, KYUSHU_IDS), KYUSHU_IDS.length, 'region'),
          make('shikoku-pilgrim', '四国', '시코쿠 순례', '시코쿠 4개 지역 모두 방문하기', visitedIn(prefRegions, SHIKOKU_IDS), SHIKOKU_IDS.length, 'region'),
        ]
      : [
          make('capital-master', '首', '수도권 제패', '수도권 3개 지역 모두 방문하기', visitedIn(prefRegions, K_CAPITAL_IDS), K_CAPITAL_IDS.length, 'region'),
          make('chungcheong-master', '忠', '충청 제패', '충청 4개 지역 모두 방문하기', visitedIn(prefRegions, K_CHUNGCHEONG_IDS), K_CHUNGCHEONG_IDS.length, 'region'),
          make('gyeongsang-master', '慶', '경상 제패', '경상 5개 지역 모두 방문하기', visitedIn(prefRegions, K_GYEONGSANG_IDS), K_GYEONGSANG_IDS.length, 'region'),
          make('jeolla-master', '全', '전라 제패', '전라 2개 지역 모두 방문하기', visitedIn(prefRegions, K_JEOLLA_IDS), K_JEOLLA_IDS.length, 'region'),
        ]

  // 광역 완주 도장: 한 광역(도도부현/시도)의 소속 기초를 전부 방문하면 발급.
  // 완주한 광역만 노출한다(광역이 63개라 미완주까지 다 띄우면 도장첩이 넘침).
  const visitedByPref: Record<string, number> = {}
  for (const r of regions) {
    if (!r.regionId.includes('_')) continue
    if (!isRegionOfCountry(r.regionId, country)) continue
    if (isHiddenRegion(r.regionId)) continue
    if (levelOf(r) <= GyeongHyeonChi.UNVISITED) continue
    const prefId = r.regionId.split('_')[0]
    visitedByPref[prefId] = (visitedByPref[prefId] || 0) + 1
  }
  const label = COMPLETE_LABEL[lang] ?? COMPLETE_LABEL.ko
  const prefCompletionBadges: Badge[] = []
  for (const [prefId, visited] of Object.entries(visitedByPref)) {
    const total = MUNI_COUNT_BY_PREF[prefId]
    if (!total || visited < total) continue
    const meta = getRegionMetadata(prefId)
    if (!meta) continue
    const rname = regionDisplayName(meta, lang)
    prefCompletionBadges.push(
      make(`pref-complete-${prefId}`, sealChar(meta), `${rname} ${label.suffix}`, label.desc(rname), visited, total, 'region'),
    )
  }

  return [
    make('first-step', '足', '첫 발자국', '첫 지역 기록하기', visitedCount, 1),
    make('explorer', '探', '탐험가', '10개 지역 방문하기', visitedCount, 10),
    make('adventurer', '冒', '모험가', '25개 지역 방문하기', visitedCount, 25),
    make('half-japan', '半', '절반 정복', '달성률 50% 달성하기', completionRate, 0.5),
    make('complete', '制覇', '전국 제패', '모든 지역 방문하기', visitedCount, totalRegions),
    make('both-countries', '渡', '바다를 건너', '두 나라 모두에 도장 찍기', bothCountries, 2),
    make('first-stay', '泊', '첫 숙박', '숙박(4) 지역 만들기', stayedCount, 1),
    make('first-master', '住', '첫 마스터', '거주(5) 지역 만들기', masterCount, 1),
    make('triple-master', '三住', '트리플 마스터', '거주(5) 지역 3개 만들기', masterCount, 3),
    ...regionalBadges,
    ...prefCompletionBadges,
    make('muni-10', '巷', '골목 여행자', '기초 지역 10곳 기록하기', muniCount, 10),
    make('muni-50', '洞', '동네 수집가', '기초 지역 50곳 기록하기', muniCount, 50),
    make('muni-100', '坊', '방방곡곡', '기초 지역 100곳 기록하기', muniCount, 100),
    // GPS 트랙 거리 뱃지는 연속 추적 자산 — 추적이 꺼져 있으면 trackKm가 항상 0이라
    // 영원히 달성 불가하므로 숨긴다. (ENABLE_GPS_TRACKING 부활 시 함께 복귀)
    ...(ENABLE_GPS_TRACKING
      ? [
          make('on-the-road', '道', '길 위에서', 'GPS 트랙 10km 기록하기', trackKm, 10),
          make('long-road', '長', '대장정', 'GPS 트랙 100km 기록하기', trackKm, 100),
        ]
      : []),
  ]
}
