import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { requireAuth } from './_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const [envelopes, pots, transactions, settings] = await Promise.all([
    prisma.envelope.findMany({ orderBy: { id: 'asc' } }),
    prisma.pot.findMany({ orderBy: { id: 'asc' } }),
    prisma.transaction.findMany({ orderBy: { id: 'asc' } }),
    prisma.settings.findMany()
  ])

  res.status(200).json({
    exportedAt: new Date().toISOString(),
    envelopes,
    pots,
    transactions: transactions.map((t) => ({ ...t, createdAt: Number(t.createdAt) })),
    settings
  })
}

export default requireAuth(handler)
