import Dexie, { type Table } from 'dexie'
import type { Envelope, Pot, Transaction, Settings } from './types'
import { SETTINGS_ID } from './types'

export class CicloDB extends Dexie {
  envelopes!: Table<Envelope, number>
  pots!: Table<Pot, number>
  transactions!: Table<Transaction, number>
  settings!: Table<Settings, number>

  constructor() {
    super('ciclo-db')
    this.version(1).stores({
      // `archived` is intentionally not indexed: it's a boolean, which is not a
      // valid IndexedDB key in every engine, and tables here are small enough
      // (single user) to just fetch-and-filter in JS.
      envelopes: '++id, name, order',
      pots: '++id, name, kind, order',
      transactions:
        '++id, date, type, envelopeId, potId, toPotId, linkedTransactionId, createdAt',
      settings: '++id'
    })
  }
}

export const db = new CicloDB()

const SEED_ENVELOPES: Omit<Envelope, 'id'>[] = [
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

const SEED_POTS: Omit<Pot, 'id'>[] = [
  { name: 'Conta Principal', kind: 'spending', target: null, order: 0 },
  { name: 'Fundo Emergência', kind: 'goal', target: 6000, order: 1 },
  { name: 'Bolsa Combustível', kind: 'buffer', target: 500, order: 2 },
  { name: 'Conta Supermercado', kind: 'buffer', target: null, order: 3 }
]

const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  cycleStartDay: 21,
  currency: 'EUR',
  locale: 'pt-PT',
  baseIncomeDefault: 0
}

let seeded = false

export async function ensureSeeded() {
  if (seeded) return
  await db.transaction('rw', db.envelopes, db.pots, db.settings, async () => {
    const envelopeCount = await db.envelopes.count()
    if (envelopeCount === 0) {
      await db.envelopes.bulkAdd(SEED_ENVELOPES)
    }
    const potCount = await db.pots.count()
    if (potCount === 0) {
      await db.pots.bulkAdd(SEED_POTS)
    }
    const existingSettings = await db.settings.get(SETTINGS_ID)
    if (!existingSettings) {
      await db.settings.put(DEFAULT_SETTINGS)
    }
  })
  seeded = true
}
