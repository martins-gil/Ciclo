import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { ensureSeeded } from './_lib/seed'
import { requireAuth } from './_lib/auth'
import type { Transaction as PrismaTransaction } from '@prisma/client'

// createdAt is BIGINT in Postgres (Prisma -> JS `bigint`), which JSON.stringify
// can't serialize directly. Timestamps comfortably fit in a safe JS Number.
function serialize(t: PrismaTransaction) {
  return { ...t, createdAt: Number(t.createdAt) }
}

const VALID_TYPES = ['spend', 'transfer', 'reimbursement_pending', 'reimbursement_received', 'income']

async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSeeded()

  if (req.method === 'GET') {
    const transactions = await prisma.transaction.findMany({ orderBy: { id: 'asc' } })
    res.status(200).json(transactions.map(serialize))
    return
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as Record<string, unknown>
    const { date, amount, description, type } = body

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'data inválida' })
      return
    }
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'valor inválido' })
      return
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({ error: 'descrição em falta' })
      return
    }
    if (typeof type !== 'string' || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: 'tipo inválido' })
      return
    }

    const created = await prisma.transaction.create({
      data: {
        date,
        amount: Math.round(amount * 100) / 100,
        description: description.trim(),
        type: type as PrismaTransaction['type'],
        envelopeId: typeof body.envelopeId === 'number' ? body.envelopeId : null,
        potId: typeof body.potId === 'number' ? body.potId : null,
        toPotId: typeof body.toPotId === 'number' ? body.toPotId : null,
        isBaseIncome: typeof body.isBaseIncome === 'boolean' ? body.isBaseIncome : null,
        linkedTransactionId: typeof body.linkedTransactionId === 'number' ? body.linkedTransactionId : null,
        createdAt: BigInt(Date.now())
      }
    })
    res.status(201).json(serialize(created))
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default requireAuth(handler)
