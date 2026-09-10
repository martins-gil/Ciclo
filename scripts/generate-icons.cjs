// Generates simple placeholder PWA icons (a ring motif for "Ciclo") using only
// Node's built-in zlib — no image library dependency. Replace public/icons/*.png
// with real branding whenever you like; the manifest just points at those files.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function makePng(size, draw) {
  const width = size, height = size
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = draw(x, y, width, height)
      const o = rowStart + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Brand: indigo background, white ring (cycle motif), optional padding for maskable safe zone.
function ringIcon(size, { padded = false } = {}) {
  const cx = size / 2, cy = size / 2
  const outerR = size * (padded ? 0.30 : 0.36)
  const innerR = size * (padded ? 0.19 : 0.23)
  const bg = [79, 70, 229, 255] // indigo-600
  const fg = [255, 255, 255, 255]
  return makePng(size, (x, y) => {
    const dx = x - cx, dy = y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d <= outerR && d >= innerR) return fg
    return bg
  })
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'icon-192.png'), ringIcon(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), ringIcon(512))
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), ringIcon(512, { padded: true }))
console.log('Icons written to', outDir)
