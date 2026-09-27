import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthenticated } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ authenticated: isAuthenticated(req) })
}
