import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { ensureSeeded } from './_lib/seed'
import { requireAuth } from './_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSeeded()

  if (req.method === 'GET') {
    const envelopes = await prisma.envelope.findMany({ orderBy: { order: 'asc' } })
    res.status(200).json(envelopes)
    return
  }

  if (req.method === 'PATCH') {
    const id = Number(req.query.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id em falta ou inválido' })
      return
    }
    const { monthlyCap } = (req.body ?? {}) as { monthlyCap?: number }
    if (typeof monthlyCap !== 'number' || Number.isNaN(monthlyCap) || monthlyCap < 0) {
      res.status(400).json({ error: 'monthlyCap inválido' })
      return
    }
    const updated = await prisma.envelope.update({ where: { id }, data: { monthlyCap } })
    res.status(200).json(updated)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default requireAuth(handler)
