import { prisma } from './db.js'

const SEED_ENVELOPES = [
  { name: 'Casa', monthlyCap: 700, passthrough: false, order: 0 },
  { name: 'Alimentação', monthlyCap: 120, passthrough: false, order: 1 },
  { name: 'Padel', monthlyCap: 65, passthrough: false, order: 2 },
  { name: 'Saúde', monthlyCap: 35, passthrough: false, order: 3 },
  { name: 'Seguro carro', monthlyCap: 17.64, passthrough: false, order: 4 },
  { name: 'Comissões banco', monthlyCap: 3.33, passthrough: false, order: 5 },
  { name: 'Levantamentos', monthlyCap: 15, passthrough: false, order: 6 },
  { name: 'Compras/presentes', monthlyCap: 40, passthrough: false, order: 7 },
  { name: 'Combustível', monthlyCap: 0, passthrough: true, order: 8 }
]

const SEED_POTS = [
  { name: 'Conta Principal', kind: 'spending' as const, target: null, order: 0 },
  { name: 'Fundo Emergência', kind: 'goal' as const, target: 6000, order: 1 },
  { name: 'Bolsa Combustível', kind: 'buffer' as const, target: 500, order: 2 },
  { name: 'Conta Supermercado', kind: 'buffer' as const, target: null, order: 3 }
]

let seeded = false

/** Mirrors the original client-side ensureSeeded() — runs once per cold start, idempotent. */
export async function ensureSeeded() {
  if (seeded) return
  const envelopeCount = await prisma.envelope.count()
  if (envelopeCount === 0) {
    await prisma.envelope.createMany({ data: SEED_ENVELOPES })
  }
  const potCount = await prisma.pot.count()
  if (potCount === 0) {
    await prisma.pot.createMany({ data: SEED_POTS })
  }
  const settings = await prisma.settings.findFirst()
  if (!settings) {
    await prisma.settings.create({
      data: { cycleStartDay: 21, currency: 'EUR', locale: 'pt-PT', baseIncomeDefault: 0 }
    })
  }
  seeded = true
}
