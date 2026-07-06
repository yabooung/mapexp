/**
 * PWA 아이콘 생성 스크립트 (의존성 없음)
 * 인디고 그라데이션 배경 + 흰색 맵 핀을 그려 PNG로 저장한다.
 * 사용법: node scripts/gen-icons.js
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---------- PNG 인코더 ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 스캔라인 앞에 필터 바이트(0) 추가
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 드로잉 ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v))
// 부드러운 경계 (안티앨리어싱)
const smooth = (dist, aa) => clamp01(0.5 - dist / aa)

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const aa = 2.5 // 안티앨리어싱 폭 (px)
  const cornerR = maskable ? 0 : size * 0.2
  const scale = maskable ? 0.72 : 0.92 // maskable은 safe zone 확보

  // 핀 지오메트리 (아이콘 좌표계 0~1, scale 적용)
  const cx = 0.5
  const headY = 0.40
  const headR = 0.21
  const holeR = 0.088
  const tipY = 0.74

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const px = x + 0.5
      const py = y + 0.5

      // 배경: 라운드 사각형
      let bgAlpha = 1
      if (cornerR > 0) {
        const dx = Math.max(Math.abs(px - size / 2) - (size / 2 - cornerR), 0)
        const dy = Math.max(Math.abs(py - size / 2) - (size / 2 - cornerR), 0)
        const dist = Math.sqrt(dx * dx + dy * dy) - cornerR
        bgAlpha = smooth(dist, aa)
      }

      // 세로 그라데이션 #6366F1 → #4338CA
      const t = y / size
      const bgR = Math.round(0x63 + (0x43 - 0x63) * t)
      const bgG = Math.round(0x66 + (0x38 - 0x66) * t)
      const bgB = Math.round(0xf1 + (0xca - 0xf1) * t)

      // 핀 좌표 (scale 중심 보정)
      const nx = (px / size - 0.5) / scale + 0.5
      const ny = (py / size - 0.5) / scale + 0.5

      // 핀 = 원(머리) ∪ 삼각형(꼬리), 구멍 제외
      const dHead = Math.sqrt((nx - cx) ** 2 + (ny - headY) ** 2)
      const headCov = smooth((dHead - headR) * size * scale, aa)

      // 삼각형: apex(0.5, tipY), 원 접선 근사 base
      const baseHalf = headR * 0.62
      const baseY = headY + headR * 0.55
      let triCov = 0
      if (ny >= baseY - 0.01 && ny <= tipY) {
        const tt = (ny - baseY) / (tipY - baseY)
        const half = baseHalf * (1 - tt)
        const dist = (Math.abs(nx - cx) - half) * size * scale
        triCov = smooth(dist, aa) * smooth((ny - tipY) * size * scale, aa)
      }

      const holeCov = smooth((dHead - holeR) * size * scale, aa)
      const pinCov = clamp01(Math.max(headCov, triCov) - holeCov)

      // 합성: 배경 위에 흰색 핀
      const r = bgR + (255 - bgR) * pinCov
      const g = bgG + (255 - bgG) * pinCov
      const b = bgB + (255 - bgB) * pinCov

      rgba[idx] = Math.round(r)
      rgba[idx + 1] = Math.round(g)
      rgba[idx + 2] = Math.round(b)
      rgba[idx + 3] = Math.round(bgAlpha * 255)
    }
  }
  return encodePng(size, size, rgba)
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512))
fs.writeFileSync(path.join(outDir, 'maskable-512.png'), drawIcon(512, { maskable: true }))
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), drawIcon(180, { maskable: true }))

console.log('Icons generated in public/icons/')
