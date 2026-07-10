/**
 * 일본 시정촌 다국어 이름 생성 스크립트
 *
 * 출처: nojimage/local-gov-code-jp (총무성 전국지방공공단체코드, 가나 읽기 포함)
 *   - cities.json: 시·정·촌·도쿄특별구 (1,747)
 *   - wards.json : 정령지정시의 구 (171)
 *
 * 출력: public/geojson/jp-muni-names.json
 *   { "<5자리 코드>": { "e": "<영어(로마자)>", "k": "<한국어 표기>" } }
 *   코드는 N03_007(체크섬 없는 5자리)과 일치하도록 6자리 코드의 앞 5자리를 사용.
 *
 * 변환 규칙:
 *   - 로마자: 헵번식 간이형 (장음 ou→o/uu→u/oo→o 축약, っ=자음 중복, ん=n)
 *   - 한국어: 외래어 표기법 일본어 규정 (か행·た행 어두 예사소리/어중 거센소리,
 *             つ=쓰, っ=받침 ㅅ, ん=받침 ㄴ, 장음 미표기)
 *   - 표시 형식:
 *       시(市)          e: "Sapporo"        k: "삿포로시"
 *       정(町)·촌(村)   e: "Okutama-machi"  k: "오쿠타마마치"
 *       특별구(区)      e: "Chiyoda-ku"     k: "지요다구"
 *       정령시 구       e: "Sapporo Chuo-ku" k: "삿포로 주오구"
 *
 * 실행: node scripts/gen-muni-names.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = 'https://raw.githubusercontent.com/nojimage/local-gov-code-jp/master'

// ── 가나 파서: 요음/촉음/발음 처리를 위해 공용 토크나이저 ──
const SMALL = { ゃ: 'ゃ', ゅ: 'ゅ', ょ: 'ょ' }

function tokenize(kana) {
  const tokens = []
  for (let i = 0; i < kana.length; i++) {
    const ch = kana[i]
    const next = kana[i + 1]
    if (next && SMALL[next]) {
      tokens.push(ch + next)
      i++
    } else {
      tokens.push(ch)
    }
  }
  return tokens
}

// ── 로마자 (헵번식 간이형) ──
const ROMAJI = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',
  か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',
  さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
  た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
  な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',
  は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
  ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',
  や:'ya',ゆ:'yu',よ:'yo',
  ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',
  わ:'wa',ゐ:'i',ゑ:'e',を:'o',
  が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',
  ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',
  だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
  ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',
  ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',
  きゃ:'kya',きゅ:'kyu',きょ:'kyo', しゃ:'sha',しゅ:'shu',しょ:'sho',
  ちゃ:'cha',ちゅ:'chu',ちょ:'cho', にゃ:'nya',にゅ:'nyu',にょ:'nyo',
  ひゃ:'hya',ひゅ:'hyu',ひょ:'hyo', みゃ:'mya',みゅ:'myu',みょ:'myo',
  りゃ:'rya',りゅ:'ryu',りょ:'ryo', ぎゃ:'gya',ぎゅ:'gyu',ぎょ:'gyo',
  じゃ:'ja',じゅ:'ju',じょ:'jo', びゃ:'bya',びゅ:'byu',びょ:'byo',
  ぴゃ:'pya',ぴゅ:'pyu',ぴょ:'pyo',
}

function toRomaji(kana) {
  const tokens = tokenize(kana)
  let out = ''
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]
    if (tk === 'っ') {
      const nxt = ROMAJI[tokens[i + 1]] ?? ''
      // 헵번식: っち는 t로 중복
      out += nxt.startsWith('ch') ? 't' : nxt[0] ?? ''
      continue
    }
    if (tk === 'ん') { out += 'n'; continue }
    if (tk === 'ー') continue
    out += ROMAJI[tk] ?? ''
  }
  // 장음 축약 (Tokyo/Kyushu/Osaka 관용 표기)
  out = out.replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/oo/g, 'o').replace(/aa/g, 'a')
  return out.charAt(0).toUpperCase() + out.slice(1)
}

// ── 한국어 (외래어 표기법 일본어 규정) ──
// [어두 표기, 어중·어말 표기]
const HANGUL = {
  あ:['아','아'],い:['이','이'],う:['우','우'],え:['에','에'],お:['오','오'],
  か:['가','카'],き:['기','키'],く:['구','쿠'],け:['게','케'],こ:['고','코'],
  さ:['사','사'],し:['시','시'],す:['스','스'],せ:['세','세'],そ:['소','소'],
  た:['다','타'],ち:['지','치'],つ:['쓰','쓰'],て:['데','테'],と:['도','토'],
  な:['나','나'],に:['니','니'],ぬ:['누','누'],ね:['네','네'],の:['노','노'],
  は:['하','하'],ひ:['히','히'],ふ:['후','후'],へ:['헤','헤'],ほ:['호','호'],
  ま:['마','마'],み:['미','미'],む:['무','무'],め:['메','메'],も:['모','모'],
  や:['야','야'],ゆ:['유','유'],よ:['요','요'],
  ら:['라','라'],り:['리','리'],る:['루','루'],れ:['레','레'],ろ:['로','로'],
  わ:['와','와'],ゐ:['이','이'],ゑ:['에','에'],を:['오','오'],
  が:['가','가'],ぎ:['기','기'],ぐ:['구','구'],げ:['게','게'],ご:['고','고'],
  ざ:['자','자'],じ:['지','지'],ず:['즈','즈'],ぜ:['제','제'],ぞ:['조','조'],
  だ:['다','다'],ぢ:['지','지'],づ:['즈','즈'],で:['데','데'],ど:['도','도'],
  ば:['바','바'],び:['비','비'],ぶ:['부','부'],べ:['베','베'],ぼ:['보','보'],
  ぱ:['파','파'],ぴ:['피','피'],ぷ:['푸','푸'],ぺ:['페','페'],ぽ:['포','포'],
  きゃ:['갸','캬'],きゅ:['규','큐'],きょ:['교','쿄'],
  しゃ:['샤','샤'],しゅ:['슈','슈'],しょ:['쇼','쇼'],
  ちゃ:['자','차'],ちゅ:['주','추'],ちょ:['조','초'],
  にゃ:['냐','냐'],にゅ:['뉴','뉴'],にょ:['뇨','뇨'],
  ひゃ:['햐','햐'],ひゅ:['휴','휴'],ひょ:['효','효'],
  みゃ:['먀','먀'],みゅ:['뮤','뮤'],みょ:['묘','묘'],
  りゃ:['랴','랴'],りゅ:['류','류'],りょ:['료','료'],
  ぎゃ:['갸','갸'],ぎゅ:['규','규'],ぎょ:['교','교'],
  じゃ:['자','자'],じゅ:['주','주'],じょ:['조','조'],
  びゃ:['뱌','뱌'],びゅ:['뷰','뷰'],びょ:['뵤','뵤'],
  ぴゃ:['퍄','퍄'],ぴゅ:['퓨','퓨'],ぴょ:['표','표'],
}
// 장음 처리용: 각 음절의 모음 (앞 음절과 같은 모음의 あ행이 이어지면 장음 → 생략)
const VOWEL = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',
}

const JONG_NIEUN = 4  // ㄴ
const JONG_SIOT = 19  // ㅅ

function addJong(syl, jong) {
  const code = syl.charCodeAt(0) - 0xac00
  if (code < 0 || code % 28 !== 0) return syl // 이미 받침 있음 - 그대로
  return String.fromCharCode(syl.charCodeAt(0) + jong)
}

function lastVowelOf(token) {
  // 토큰의 로마자 마지막 모음으로 장음 판정
  const r = ROMAJI[token]
  if (!r) return null
  return r[r.length - 1]
}

function toHangul(kana) {
  const tokens = tokenize(kana)
  let out = []
  let prevVowel = null
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]
    if (tk === 'っ') {
      if (out.length) out[out.length - 1] = addJong(out[out.length - 1], JONG_SIOT)
      continue
    }
    if (tk === 'ん') {
      if (out.length) out[out.length - 1] = addJong(out[out.length - 1], JONG_NIEUN)
      prevVowel = null
      continue
    }
    if (tk === 'ー') continue
    // 장음: 직전 모음과 같은 단독 모음(あ행)은 생략 (おおさか→오사카, ちゅうおう→주오)
    if (VOWEL[tk] && VOWEL[tk] === prevVowel) { continue }
    // う가 お단 뒤에 오면 장음 (とう→도, きょう→교)
    if (tk === 'う' && prevVowel === 'o') { continue }
    // い가 え단 뒤에 오면 장음 (けい→게)
    if (tk === 'い' && prevVowel === 'e') { continue }
    const pair = HANGUL[tk]
    if (!pair) continue
    out.push(out.length === 0 ? pair[0] : pair[1])
    prevVowel = lastVowelOf(tk)
  }
  return out.join('')
}

// ── 표시 형식 조립 ──
function stripSuffix(kana, kanjiName) {
  // (kana에서 접미 읽기, 접미 종류) 반환
  if (kanjiName.endsWith('市') && kana.endsWith('し')) return [kana.slice(0, -1), 'shi']
  if (kanjiName.endsWith('区') && kana.endsWith('く')) return [kana.slice(0, -1), 'ku']
  if (kanjiName.endsWith('町')) {
    if (kana.endsWith('ちょう')) return [kana.slice(0, -3), 'cho']
    if (kana.endsWith('まち')) return [kana.slice(0, -2), 'machi']
  }
  if (kanjiName.endsWith('村')) {
    if (kana.endsWith('むら')) return [kana.slice(0, -2), 'mura']
    if (kana.endsWith('そん')) return [kana.slice(0, -2), 'son']
  }
  return [kana, '']
}

function englishName(kana, kanjiName) {
  const [base, suffix] = stripSuffix(kana, kanjiName)
  const stem = toRomaji(base)
  if (suffix === 'shi' || suffix === '') return stem      // 시는 접미 생략 (Sapporo)
  return `${stem}-${suffix}`                               // Okutama-machi, Chiyoda-ku
}

// 행정 단위 접미사는 한국 관례 표기 고정 (区는 음역 '쿠'가 아니라 '구')
const KO_SUFFIX = { shi: '시', ku: '구', machi: '마치', cho: '초', mura: '무라', son: '손', '': '' }

function koreanName(kana, kanjiName) {
  const [base, suffix] = stripSuffix(kana, kanjiName)
  return toHangul(base) + KO_SUFFIX[suffix]
}

// ── 메인 ──
async function fetchJson(name) {
  const res = await fetch(`${SRC}/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return res.json()
}

const [cities, wards] = await Promise.all([fetchJson('cities.json'), fetchJson('wards.json')])

const out = {}
for (const c of cities) {
  const code5 = c.code.slice(0, 5)
  out[code5] = {
    e: englishName(c.city_kana, c.city_name),
    k: koreanName(c.city_kana, c.city_name),
  }
}
for (const w of wards) {
  const code5 = w.code.slice(0, 5)
  // 정령시 구는 "시 구" 조합 표시 (mapexp의 ID/표시 규약과 동일: 札幌市中央区)
  const cityStemKana = w.city_kana.endsWith('し') ? w.city_kana.slice(0, -1) : w.city_kana
  out[code5] = {
    e: `${toRomaji(cityStemKana)} ${englishName(w.ward_kana, w.ward_name)}`,
    k: `${toHangul(cityStemKana)} ${koreanName(w.ward_kana, w.ward_name)}`,
  }
}

const dest = join(ROOT, 'public', 'geojson', 'jp-muni-names.json')
writeFileSync(dest, JSON.stringify(out), 'utf-8')
console.log(`wrote ${Object.keys(out).length} entries → ${dest}`)

// 눈 검증용 샘플
for (const code of ['01101', '13101', '13308', '27100', '13421', '26100']) {
  if (out[code]) console.log(code, JSON.stringify(out[code]))
}
