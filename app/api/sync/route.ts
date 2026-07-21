import { createClient, type RedisClientType } from 'redis'
import { parseImportFile, buildExportEnvelope } from '@/lib/dataFile'

/**
 * 기기 간 동기화 (계정 없음) — 짧은 코드 방식.
 *
 * POST: 내 기록 스냅샷을 저장하고 6자리 코드를 발급. (로컬 우선, opt-in 클라우드)
 * GET ?code=XXXXXX: 코드로 스냅샷을 불러온다.
 *
 * 데이터는 Redis에 코드 키로 TTL(30일)만 보관 — 계정·개인정보 없음.
 * 신뢰 불가 입력이므로 parseImportFile로 타입 강제 후에만 저장/반환한다.
 */

// TCP 소켓 기반 node-redis는 Node 런타임 필요 (엣지 불가)
export const runtime = 'nodejs'

// 혼동 문자 제외(0/O/1/I/L) — 전화로 불러줘도 안 헷갈리게
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LEN = 6
const TTL_DAYS = 30
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60
const MAX_BODY_BYTES = 1_000_000 // 1MB — 비정상적으로 큰 페이로드 방어

// 웜 인스턴스 간 커넥션 재사용 (서버리스에서 매 요청 새 연결 방지)
let client: RedisClientType | null = null

async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL ?? process.env.KV_URL
  if (!url) return null
  if (client?.isOpen) return client
  client = createClient({ url })
  client.on('error', () => {}) // 미처리 rejection으로 함수 죽지 않게
  if (!client.isOpen) await client.connect()
  return client
}

function genCode(): string {
  const bytes = new Uint8Array(CODE_LEN)
  globalThis.crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < CODE_LEN; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

const notConfigured = () => Response.json({ error: 'sync_not_configured' }, { status: 503 })

export async function POST(req: Request) {
  const redis = await getRedis()
  if (!redis) return notConfigured()

  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }

  // 신뢰 불가 입력: 스키마/타입 검증 통과분만 저장 (봉투·맨몸 모두 수용)
  const data = parseImportFile(text)
  if (!data) return Response.json({ error: 'invalid_data' }, { status: 400 })

  const payload = JSON.stringify(buildExportEnvelope(data))

  // 코드 충돌 회피: 몇 번 재시도 (SET NX EX)
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genCode()
    const ok = await redis.set(`sync:${code}`, payload, { NX: true, EX: TTL_SECONDS })
    if (ok === 'OK') {
      return Response.json({ code, ttlDays: TTL_DAYS })
    }
  }
  return Response.json({ error: 'code_conflict' }, { status: 500 })
}

export async function GET(req: Request) {
  const redis = await getRedis()
  if (!redis) return notConfigured()

  const code = new URL(req.url).searchParams.get('code')?.trim().toUpperCase()
  if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
    return Response.json({ error: 'invalid_code' }, { status: 400 })
  }

  const raw = await redis.get(`sync:${code}`)
  if (!raw) return Response.json({ error: 'not_found' }, { status: 404 })

  // 저장본도 반환 전 재검증 (혹시 모를 손상/구버전 방어)
  const data = parseImportFile(raw)
  if (!data) return Response.json({ error: 'corrupt' }, { status: 500 })

  return Response.json({ data })
}
