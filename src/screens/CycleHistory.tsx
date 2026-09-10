import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSettings } from '../hooks/useSettings'
import { cycleIdToRange, listCycleIdsSince, formatCycleLabel } from '../lib/cycle'
import { transactionsInCycle, computeEnvelopeProgress, computeRealSpendTotal, computeIncome } from '../lib/aggregate'
import { formatCurrency } from '../lib/currency'
import ProgressBar from '../components/ProgressBar'
import SubTabHeader from '../components/SubTabHeader'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function CycleHistory({
  onSwitchTab,
  activeSubTab
}: {
  onSwitchTab: (t: 'history' | 'reports') => void
  activeSubTab: 'history' | 'reports'
}) {
  const settings = useSettings()
  const envelopes = useLiveQuery(() => db.envelopes.orderBy('order').toArray(), []) ?? []
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const [expanded, setExpanded] = useState<string | null>(null)

  const activeEnvelopes = envelopes.filter((e) => !e.archived)

  const cycleIds = useMemo(() => {
    if (allTransactions.length === 0) return listCycleIdsSince(new Date(), settings.cycleStartDay)
    const earliest = allTransactions.reduce((min, t) => (t.date < min ? t.date : min), allTransactions[0].date)
    return listCycleIdsSince(new Date(earliest), settings.cycleStartDay)
  }, [allTransactions, settings.cycleStartDay])

  const rows = useMemo(
    () =>
      cycleIds.map((id) => {
        const range = cycleIdToRange(id, settings.cycleStartDay)
        const cTx = transactionsInCycle(allTransactions, range)
        const realSpend = computeRealSpendTotal(cTx, activeEnvelopes)
        const income = computeIncome(cTx)
        const envelopeProgress = computeEnvelopeProgress(cTx, activeEnvelopes)
        return { id, range, realSpend, income, envelopeProgress }
      }),
    [cycleIds, allTransactions, activeEnvelopes, settings.cycleStartDay]
  )

  return (
    <div className="safe-top px-4 pt-6">
      <h1 className="mb-4 text-xl font-bold">Ciclos</h1>
      <SubTabHeader active={activeSubTab} onChange={onSwitchTab} />

      <div className="space-y-2">
        {rows.map((row) => {
          const isOpen = expanded === row.id
          return (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => setExpanded(isOpen ? null : row.id)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold">{formatCycleLabel(row.range)}</p>
                  <p className="text-xs text-slate-400">
                    Rendimento: {formatCurrency(row.income.base + row.income.variable)}
                    {row.income.variable > 0 && ` (${formatCurrency(row.income.variable)} variável)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(row.realSpend)}</span>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 px-4 py-3">
                  {row.envelopeProgress.map(({ envelope, spent, cap, pct }) => (
                    <div key={envelope.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">{envelope.name}</span>
                        <span className="tabular-nums text-slate-400">
                          {formatCurrency(spent)} / {formatCurrency(cap)}
                        </span>
                      </div>
                      <ProgressBar pct={pct} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
