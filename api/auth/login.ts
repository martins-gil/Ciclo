import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    res.status(500).json({ error: 'ADMIN_PASSWORD_HASH não está configurada' })
    return
  }

  const { password } = (req.body ?? {}) as { password?: string }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Palavra-passe em falta' })
    return
  }

  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    res.status(401).json({ error: 'Palavra-passe incorreta' })
    return
  }

  setSessionCookie(res, createSessionToken())
  res.status(200).json({ ok: true })
}
