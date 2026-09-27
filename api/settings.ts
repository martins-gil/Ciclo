import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { ensureSeeded } from './_lib/seed'
import { requireAuth } from './_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSeeded()

  if (req.method === 'GET') {
    const settings = await prisma.settings.findFirst()
    res.status(200).json(settings)
    return
  }

  if (req.method === 'PATCH') {
    const body = (req.body ?? {}) as Record<string, unknown>
    const data: Record<string, number> = {}

    if (body.cycleStartDay !== undefined) {
      const v = Number(body.cycleStartDay)
      if (!Number.isInteger(v) || v < 1 || v > 28) {
        res.status(400).json({ error: 'cycleStartDay deve ser um número entre 1 e 28' })
        return
      }
      data.cycleStartDay = v
    }
    if (body.baseIncomeDefault !== undefined) {
      const v = Number(body.baseIncomeDefault)
      if (Number.isNaN(v) || v < 0) {
        res.status(400).json({ error: 'baseIncomeDefault inválido' })
        return
      }
      data.baseIncomeDefault = v
    }

    const existing = await prisma.settings.findFirst()
    if (!existing) {
      res.status(500).json({ error: 'settings não inicializadas' })
      return
    }
    const updated = await prisma.settings.update({ where: { id: existing.id }, data })
    res.status(200).json(updated)
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default requireAuth(handler)
