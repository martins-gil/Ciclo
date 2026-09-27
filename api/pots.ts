import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { ensureSeeded } from './_lib/seed'
import { requireAuth } from './_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSeeded()

  if (req.method === 'GET') {
    const pots = await prisma.pot.findMany({ orderBy: { order: 'asc' } })
    res.status(200).json(pots)
    return
  }

  if (req.method === 'PATCH') {
    const id = Number(req.query.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id em falta ou inválido' })
      return
    }
    const { target } = (req.body ?? {}) as { target?: number | null }
    if (target !== null && (typeof target !== 'number' || Number.isNaN(target) || target < 0)) {
      res.status(400).json({ error: 'target inválido' })
      return
    }
    const updated = await prisma.pot.update({ where: { id }, data: { target } })
    res.status(200).json(updated)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default requireAuth(handler)
