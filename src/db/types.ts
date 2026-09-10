export type TransactionType =
  | 'spend'
  | 'transfer'
  | 'reimbursement_pending'
  | 'reimbursement_received'
  | 'income'

export interface Envelope {
  id?: number
  name: string
  monthlyCap: number
  passthrough: boolean
  order: number
  archived?: boolean
}

export type PotKind = 'spending' | 'goal' | 'buffer'

export interface Pot {
  id?: number
  name: string
  kind: PotKind
  target: number | null
  order: number
  archived?: boolean
}

export interface Transaction {
  id?: number
  date: string // YYYY-MM-DD
  amount: number // always positive; meaning depends on type
  description: string
  type: TransactionType
  envelopeId?: number | null // spend, reimbursement_pending
  potId?: number | null // source pot (spend/transfer/reimbursement_pending) or destination pot (income/reimbursement_received)
  toPotId?: number | null // destination pot for transfers
  isBaseIncome?: boolean | null // income only: base vs variable
  linkedTransactionId?: number | null // reimbursement_received -> reimbursement_pending
  createdAt: number
}

export interface Settings {
  id?: number // singleton row, id = 1
  cycleStartDay: number // 1-28, day of month the cycle begins
  currency: string // ISO code, e.g. 'EUR'
  locale: string // e.g. 'pt-PT'
  baseIncomeDefault: number // fallback base income when no income tx logged yet this cycle
}

export const SETTINGS_ID = 1
