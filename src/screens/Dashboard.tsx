import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useSettings } from '../hooks/useSettings'
import { getCurrentCycle, daysRemainingInCycle, formatCycleLabel, totalDaysInCycle } from '../lib/cycle'
import {
  transactionsInCycle,
  computeEnvelopeProgress,
  computePotBalance,
  computeIncome,
  committedEnvelopeCapTotal,
  computeSafeToSpendToday,
  computeRealSpendTotal
} from '../lib/aggregate'
import ProgressBar from '../components/ProgressBar'
import { formatCurrency } from '../lib/currency'

export default function Dashboard({ onAdd }: { onAdd: () => void }) {
  const settings = useSettings()
  const envelopes = useLiveQuery(() => db.envelopes.orderBy('order').toArray(), []) ?? []
  const pots = useLiveQuery(() => db.pots.orderBy('order').toArray(), []) ?? []
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) ?? []

  const cycle = useMemo(() => getCurrentCycle(settings.cycleStartDay), [settings.cycleStartDay])
  const cycleTx = useMemo(() => transactionsInCycle(allTransactions, cycle), [allTransactions, cycle])

  const activeEnvelopes = envelopes.filter((e) => !e.archived)
  const activePots = pots.filter((p) => !p.archived)

  const progress = useMemo(() => computeEnvelopeProgress(cycleTx, activeEnvelopes), [cycleTx, activeEnvelopes])
  const realSpend = useMemo(() => computeRealSpendTotal(cycleTx, activeEnvelopes), [cycleTx, activeEnvelopes])
  const income = useMemo(() => computeIncome(cycleTx), [cycleTx])
  const committedCaps = useMemo(() => committedEnvelopeCapTotal(activeEnvelopes), [activeEnvelopes])

  const daysRemaining = daysRemainingInCycle(cycle)
  const daysTotal = totalDaysInCycle(cycle)

  const baseIncome = income.base > 0 ? income.base : settings.baseIncomeDefault
  const safeToday = computeSafeToSpendToday(baseIncome, committedCaps, daysRemaining)

  return (
    <div className="safe-top px-4">
      <header className="flex items-center justify-between pt-6 pb-4">
        <div>
          <h1 className="text-xl font-bold">Ciclo</h1>
          <p className="text-sm text-slate-400">{formatCycleLabel(cycle)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{daysRemaining}</p>
          <p className="text-xs text-slate-400">de {daysTotal} dias restantes</p>
        </div>
      </header>

      {/* Safe to spend today */}
      <section className="mb-6 rounded-3xl bg-indigo-600 p-5 text-white">
        <p className="text-sm text-indigo-100">Seguro gastar hoje</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{formatCurrency(safeToday)}</p>
        <p className="mt-2 text-xs text-indigo-100">
          Rendimento base ({formatCurrency(baseIncome)}) − envelopes comprometidos (
          {formatCurrency(committedCaps)}) ÷ {daysRemaining} dias
        </p>
      </section>

      {/* Real spend total */}
      <section className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-500">Gasto real no ciclo</span>
        <span className="text-lg font-semibold tabular-nums">{formatCurrency(realSpend)}</span>
      </section>

      {/* Envelopes */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Envelopes</h2>
        <div className="space-y-3">
          {progress.map(({ envelope, spent, cap, pct, remaining }) => (
            <div key={envelope.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {envelope.name}
                  {envelope.passthrough && (
                    <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-400">
                      passthrough
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums text-slate-500">
                  {formatCurrency(spent)} / {formatCurrency(cap)}
                </span>
              </div>
              <ProgressBar pct={pct} />
              <p className={`mt-1.5 text-xs ${remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {remaining >= 0
                  ? `${formatCurrency(remaining)} restante`
                  : `${formatCurrency(-remaining)} acima do limite`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pots */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Reservas</h2>
        <div className="space-y-3">
          {activePots.map((pot) => {
            const balance = computePotBalance(allTransactions, pot.id!)
            const pct = pot.target ? (balance / pot.target) * 100 : 0
            return (
              <div key={pot.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{pot.name}</span>
                  <span className="text-sm tabular-nums text-slate-500">
                    {formatCurrency(balance)}
                    {pot.target ? ` / ${formatCurrency(pot.target)}` : ''}
                  </span>
                </div>
                {pot.target ? (
                  <ProgressBar pct={pct} />
                ) : (
                  <div className="h-2 w-full rounded-full bg-slate-100" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      <button
        onClick={onAdd}
        className="mb-8 w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-400"
      >
        + Adicionar transação
      </button>
    </div>
  )
}
