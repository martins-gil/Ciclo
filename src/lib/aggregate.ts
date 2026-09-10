import type { Envelope, Pot, Transaction } from '../db/types'
import type { CycleRange } from './cycle'
import { isDateStringInCycle } from './cycle'

export function transactionsInCycle(transactions: Transaction[], cycle: CycleRange): Transaction[] {
  return transactions.filter((t) => isDateStringInCycle(t.date, cycle))
}

/** Current balance of a pot, derived from the full transaction history. */
export function computePotBalance(transactions: Transaction[], potId: number): number {
  let balance = 0
  for (const t of transactions) {
    switch (t.type) {
      case 'income':
      case 'reimbursement_received':
        if (t.potId === potId) balance += t.amount
        break
      case 'transfer':
        if (t.toPotId === potId) balance += t.amount
        if (t.potId === potId) balance -= t.amount
        break
      case 'spend':
      case 'reimbursement_pending':
        if (t.potId === potId) balance -= t.amount
        break
    }
  }
  return balance
}

export function computeAllPotBalances(transactions: Transaction[], pots: Pot[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const p of pots) {
    if (p.id != null) map.set(p.id, computePotBalance(transactions, p.id))
  }
  return map
}

/** Real spend against an envelope within a cycle (excludes reimbursement_pending). */
export function computeEnvelopeSpend(cycleTransactions: Transaction[], envelopeId: number): number {
  return cycleTransactions
    .filter((t) => t.type === 'spend' && t.envelopeId === envelopeId)
    .reduce((sum, t) => sum + t.amount, 0)
}

export interface EnvelopeProgress {
  envelope: Envelope
  spent: number
  cap: number
  pct: number // 0..100+ never negative
  remaining: number
}

export function computeEnvelopeProgress(cycleTransactions: Transaction[], envelopes: Envelope[]): EnvelopeProgress[] {
  return envelopes
    .filter((e) => !e.archived)
    .sort((a, b) => a.order - b.order)
    .map((envelope) => {
      const spent = computeEnvelopeSpend(cycleTransactions, envelope.id!)
      const cap = envelope.monthlyCap
      const pct = cap > 0 ? (spent / cap) * 100 : spent > 0 ? 100 : 0
      return { envelope, spent, cap, pct, remaining: cap - spent }
    })
}

/** Sum of "real spend" (non-passthrough envelopes) in a cycle. */
export function computeRealSpendTotal(cycleTransactions: Transaction[], envelopes: Envelope[]): number {
  const realEnvelopeIds = new Set(envelopes.filter((e) => !e.passthrough).map((e) => e.id))
  return cycleTransactions
    .filter((t) => t.type === 'spend' && t.envelopeId != null && realEnvelopeIds.has(t.envelopeId))
    .reduce((sum, t) => sum + t.amount, 0)
}

export function computeIncome(cycleTransactions: Transaction[]): { base: number; variable: number } {
  let base = 0
  let variable = 0
  for (const t of cycleTransactions) {
    if (t.type !== 'income') continue
    if (t.isBaseIncome) base += t.amount
    else variable += t.amount
  }
  return { base, variable }
}

export function committedEnvelopeCapTotal(envelopes: Envelope[]): number {
  return envelopes
    .filter((e) => !e.archived && !e.passthrough)
    .reduce((sum, e) => sum + e.monthlyCap, 0)
}

/**
 * "Safe to spend today": what's left of base income after committed envelope
 * caps, spread evenly over the days remaining in the cycle. Deliberately
 * ignores actual spend so far and variable income — it's a simple daily
 * ceiling, not a running balance.
 */
export function computeSafeToSpendToday(
  baseIncome: number,
  committedCaps: number,
  daysRemaining: number
): number {
  const leftover = baseIncome - committedCaps
  const days = Math.max(daysRemaining, 1)
  return leftover / days
}

/** Reimbursement_pending transactions not yet linked to a reimbursement_received. */
export function unlinkedPendingReimbursements(transactions: Transaction[]): Transaction[] {
  const linkedIds = new Set(
    transactions.filter((t) => t.type === 'reimbursement_received' && t.linkedTransactionId != null).map((t) => t.linkedTransactionId)
  )
  return transactions.filter((t) => t.type === 'reimbursement_pending' && !linkedIds.has(t.id))
}
