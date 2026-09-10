import type { Transaction } from '../db/types'
import { computePotBalance } from './aggregate'
import { getCurrentCycle, cycleIdToRange, listRecentCycleIds } from './cycle'
import { transactionsInCycle } from './aggregate'

export interface PotProjection {
  balance: number
  target: number | null
  avgContributionPerCycle: number
  cyclesToTarget: number | null // null = no target, already reached, or no positive trend
  reached: boolean
}

/** Net change in a pot's balance within a single cycle. */
function potNetChangeInCycle(transactions: Transaction[], potId: number, cycleTx: Transaction[]): number {
  // Reuse computePotBalance's rules but scoped to one cycle's transactions.
  return computePotBalance(cycleTx, potId)
}

export function computePotProjection(
  allTransactions: Transaction[],
  potId: number,
  target: number | null,
  startDay: number,
  lookbackCycles = 6
): PotProjection {
  const balance = computePotBalance(allTransactions, potId)
  const reached = target != null && balance >= target

  if (target == null || reached) {
    return { balance, target, avgContributionPerCycle: 0, cyclesToTarget: null, reached }
  }

  const cycleIds = listRecentCycleIds(lookbackCycles, startDay)
  const deltas = cycleIds.map((id) => {
    const range = cycleIdToRange(id, startDay)
    const cTx = transactionsInCycle(allTransactions, range)
    return potNetChangeInCycle(allTransactions, potId, cTx)
  })
  const avg = deltas.length > 0 ? deltas.reduce((s, v) => s + v, 0) / deltas.length : 0

  const remaining = target - balance
  const cyclesToTarget = avg > 0 ? Math.ceil(remaining / avg) : null

  return { balance, target, avgContributionPerCycle: avg, cyclesToTarget, reached }
}

export function currentCycleLabel(startDay: number): string {
  return getCurrentCycle(startDay).id
}
