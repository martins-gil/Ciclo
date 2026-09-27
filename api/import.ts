import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from './_lib/db'
import { requireAuth } from './_lib/auth'

interface ImportEnvelope {
  id: number
  name: string
  monthlyCap: number
  passthrough: boolean
  order: number
  archived?: boolean
}
interface ImportPot {
  id: number
  name: string
  kind: 'spending' | 'goal' | 'buffer'
  target: number | null
  order: number
  archived?: boolean
}
interface ImportTransaction {
  id: number
  date: string
  amount: number
  description: string
  type: string
  envelopeId?: number | null
  potId?: number | null
  toPotId?: number | null
  isBaseIncome?: boolean | null
  linkedTransactionId?: number | null
  createdAt: number
}
interface ImportSettings {
  id?: number
  cycleStartDay: number
  currency: string
  locale: string
  baseIncomeDefault: number
}

async function resetSequence(table: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
  )
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = (req.body ?? {}) as {
    envelopes?: ImportEnvelope[]
    pots?: ImportPot[]
    transactions?: ImportTransaction[]
    settings?: ImportSettings[]
  }

  if (!Array.isArray(body.envelopes) || !Array.isArray(body.pots) || !Array.isArray(body.transactions)) {
    res.status(400).json({ error: 'Formato de ficheiro inválido' })
    return
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany()
      await tx.envelope.deleteMany()
      await tx.pot.deleteMany()
      await tx.settings.deleteMany()

      if (body.envelopes!.length > 0) {
        await tx.envelope.createMany({
          data: body.envelopes!.map((e) => ({
            id: e.id,
            name: e.name,
            monthlyCap: e.monthlyCap,
            passthrough: e.passthrough,
            order: e.order,
            archived: e.archived ?? false
          }))
        })
      }
      if (body.pots!.length > 0) {
        await tx.pot.createMany({
          data: body.pots!.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            target: p.target,
            order: p.order,
            archived: p.archived ?? false
          }))
        })
      }
      if (body.transactions!.length > 0) {
        await tx.transaction.createMany({
          data: body.transactions!.map((t) => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
            description: t.description,
            type: t.type as ImportTransaction['type'] as never,
            envelopeId: t.envelopeId ?? null,
            potId: t.potId ?? null,
            toPotId: t.toPotId ?? null,
            isBaseIncome: t.isBaseIncome ?? null,
            linkedTransactionId: t.linkedTransactionId ?? null,
            createdAt: BigInt(t.createdAt)
          }))
        })
      }
      if (body.settings && body.settings.length > 0) {
        const s = body.settings[0]
        await tx.settings.create({
          data: {
            id: s.id,
            cycleStartDay: s.cycleStartDay,
            currency: s.currency,
            locale: s.locale,
            baseIncomeDefault: s.baseIncomeDefault
          }
        })
      } else {
        await tx.settings.create({
          data: { cycleStartDay: 21, currency: 'EUR', locale: 'pt-PT', baseIncomeDefault: 0 }
        })
      }
    })

    await Promise.all([
      resetSequence('envelopes'),
      resetSequence('pots'),
      resetSequence('transactions'),
      resetSequence('settings')
    ])

    res.status(200).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Não foi possível importar. Verifica se o ficheiro é um backup válido do FoldWise.' })
  }
}

export default requireAuth(handler)
