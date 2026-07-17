// 광역별(도도부현/시도) 소속 기초 지역 개수 생성 → src/constants/muniCounts.ts
// "광역 완주 도장"(한 광역의 모든 기초 방문) 판정의 분모.
// geo.ts의 감지 로직(municipalityName / 코드 접두 매칭)과 동일하게 세어 런타임과 일치시킨다.
//
// 실행: node scripts/gen-muni-counts.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// 일본 도도부현 한자 → id (constants/regions.ts REGION_ID_MAP.japan에서 발췌)
const JP_MAP = {
  '北海道': 'hokkaido', '青森県': 'aomori', '岩手県': 'iwate', '宮城県': 'miyagi', '秋田県': 'akita',
  '山形県': 'yamagata', '福島県': 'fukushima', '茨城県': 'ibaraki', '栃木県': 'tochigi', '群馬県': 'gunma',
  '埼玉県': 'saitama', '千葉県': 'chiba', '東京都': 'tokyo', '神奈川県': 'kanagawa', '新潟県': 'niigata',
  '富山県': 'toyama', '石川県': 'ishikawa', '福井県': 'fukui', '山梨県': 'yamanashi', '長野県': 'nagano',
  '岐阜県': 'gifu', '静岡県': 'shizuoka', '愛知県': 'aichi', '三重県': 'mie', '滋賀県': 'shiga',
  '京都府': 'kyoto', '大阪府': 'osaka', '兵庫県': 'hyogo', '奈良県': 'nara', '和歌山県': 'wakayama',
  '鳥取県': 'tottori', '島根県': 'shimane', '岡山県': 'okayama', '広島県': 'hiroshima', '山口県': 'yamaguchi',
  '徳島県': 'tokushima', '香川県': 'kagawa', '愛媛県': 'ehime', '高知県': 'kochi', '福岡県': 'fukuoka',
  '佐賀県': 'saga', '長崎県': 'nagasaki', '熊本県': 'kumamoto', '大分県': 'oita', '宮崎県': 'miyazaki',
  '鹿児島県': 'kagoshima', '沖縄県': 'okinawa',
}

// 한국 시도 통계청 코드 앞 2자리 → id (KOREA_PROV_CODE_BY_ID 역매핑)
const KR_MAP = {
  '11': 'seoul', '21': 'busan', '22': 'daegu', '23': 'incheon', '25': 'daejeon', '26': 'ulsan',
  '29': 'sejong', '31': 'gyeonggi', '32': 'gangwon', '33': 'chungbuk', '34': 'chungnam',
  '35': 'jeonbuk', '36': 'jeonnamgwangju', '37': 'gyeongbuk', '38': 'gyeongnam', '39': 'jeju',
}

// geo.ts municipalityName과 동일 (정령지정시 구 충돌 방지: 札幌市中央区, 所属未定地 제외)
function municipalityName(props) {
  const muni = props.N03_004
  if (!muni) return null
  if (muni === '所属未定地') return null
  const city = props.N03_003
  if (city && city.endsWith('市')) return `${city}${muni}`
  return muni
}

const counts = {}

// 일본
const jp = JSON.parse(readFileSync(join(root, 'public/geojson/japan-municipalities.json'), 'utf8'))
const jpSets = {}
for (const f of jp.features) {
  const p = f.properties || {}
  const prefId = JP_MAP[p.N03_001]
  if (!prefId) continue
  const name = municipalityName(p)
  if (!name) continue
  ;(jpSets[prefId] ||= new Set()).add(name)
}
for (const [id, set] of Object.entries(jpSets)) counts[id] = set.size

// 한국
const kr = JSON.parse(readFileSync(join(root, 'public/geojson/korea-municipalities.json'), 'utf8'))
const krSets = {}
for (const f of kr.features) {
  const p = f.properties || {}
  const code = String(p.code || '')
  const prefId = KR_MAP[code.slice(0, 2)]
  if (!prefId) continue
  if (!p.name) continue
  ;(krSets[prefId] ||= new Set()).add(p.name)
}
for (const [id, set] of Object.entries(krSets)) counts[id] = set.size

// 출력 (id 사전순)
const sorted = Object.keys(counts).sort()
const body = sorted.map((id) => `  ${id}: ${counts[id]},`).join('\n')
const out = `// 자동 생성 — scripts/gen-muni-counts.mjs (수정 금지, 재생성으로 갱신)
// 광역별(도도부현/시도) 소속 기초 지역(시정촌/시군구) 개수 = "광역 완주 도장" 판정 분모.
export const MUNI_COUNT_BY_PREF: Record<string, number> = {
${body}
}
`
writeFileSync(join(root, 'src/constants/muniCounts.ts'), out)
console.log(`generated src/constants/muniCounts.ts (${sorted.length} prefs)`)
console.log('JP total munis:', Object.entries(counts).filter(([id]) => jpSets[id]).reduce((a, [, n]) => a + n, 0))
console.log('KR total munis:', Object.entries(counts).filter(([id]) => krSets[id]).reduce((a, [, n]) => a + n, 0))
console.log('sample:', { tokyo: counts.tokyo, osaka: counts.osaka, hokkaido: counts.hokkaido, seoul: counts.seoul, jeju: counts.jeju, jeonnamgwangju: counts.jeonnamgwangju })
