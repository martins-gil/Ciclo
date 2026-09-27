import crypto from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'ciclo_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

function sign(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex')
}

/** Opaque session token: "<expiryEpochMs>.<hmac>" — no user data encoded, just a timed, tamper-proof pass. */
export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = String(expires)
  return `${payload}.${sign(payload)}`
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = sign(payload)
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return false
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false
  const expires = Number(payload)
  return Number.isFinite(expires) && Date.now() < expires
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  )
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
}

export function isAuthenticated(req: VercelRequest): boolean {
  const cookies = parseCookies(req.headers.cookie)
  return isValidSessionToken(cookies[COOKIE_NAME])
}

/** Wrap a handler so it 401s without a valid session cookie. */
export function requireAuth(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    await handler(req, res)
  }
}
