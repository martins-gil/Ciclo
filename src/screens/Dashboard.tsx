import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEnvelopes, getPots, getTransactions } from '../api/client'
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
import ProgressBar, { BudgetBar } from '../components/ProgressBar'
import { formatCurrency } from '../lib/currency'
import { Wallet } from 'lucide-react'

export default function Dashboard({ onAdd }: { onAdd: () => void }) {
  const settings = useSettings()
  const envelopesQuery = useQuery({ queryKey: ['envelopes'], queryFn: getEnvelopes })
  const potsQuery = useQuery({ queryKey: ['pots'], queryFn: getPots })
  const transactionsQuery = useQuery({ queryKey: ['transactions'], queryFn: getTransactions })

  const envelopes = envelopesQuery.data ?? []
  const pots = potsQuery.data ?? []
  const allTransactions = transactionsQuery.data ?? []
  const hasError = envelopesQuery.isError || potsQuery.isError || transactionsQuery.isError

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

  if (hasError) {
    return (
      <div className="safe-top flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-1 text-sm font-medium text-slate-600">Sem ligação</p>
        <p className="text-sm text-slate-400">Não foi possível carregar os dados. Verifica a tua ligação à internet.</p>
      </div>
    )
  }

  return (
    <div className="safe-top px-4">
      <header className="flex items-center justify-between pt-6 pb-4">
        <div>
          <h1 className="text-xl font-bold">FoldWise</h1>
          <p className="text-sm text-slate-400">{formatCycleLabel(cycle)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{daysRemaining}</p>
          <p className="text-xs text-slate-400">de {daysTotal} dias restantes</p>
        </div>
      </header>

      {/* Safe to spend today */}
      <section className="mb-6 rounded-3xl bg-yellow-400 p-5 text-slate-900">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Seguro gastar hoje</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/40">
            <Wallet size={16} />
          </div>
        </div>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">{formatCurrency(safeToday)}</p>
        <p className="mt-2 text-xs text-slate-700">
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
              <BudgetBar pct={pct} />
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
