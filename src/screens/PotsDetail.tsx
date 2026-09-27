import { useQuery } from '@tanstack/react-query'
import { getPots, getTransactions } from '../api/client'
import { useSettings } from '../hooks/useSettings'
import { computePotProjection } from '../lib/projection'
import ProgressBar from '../components/ProgressBar'
import { formatCurrency } from '../lib/currency'

const KIND_LABELS: Record<string, string> = {
  spending: 'Conta corrente',
  goal: 'Objetivo',
  buffer: 'Reserva tampão'
}

export default function PotsDetail() {
  const settings = useSettings()
  const pots = useQuery({ queryKey: ['pots'], queryFn: getPots }).data ?? []
  const allTransactions = useQuery({ queryKey: ['transactions'], queryFn: getTransactions }).data ?? []

  const activePots = pots.filter((p) => !p.archived)

  return (
    <div className="safe-top px-4 pt-6">
      <h1 className="mb-4 text-xl font-bold">Reservas</h1>
      <div className="space-y-4">
        {activePots.map((pot) => {
          const projection = computePotProjection(allTransactions, pot.id!, pot.target, settings.cycleStartDay)
          const pct = pot.target ? (projection.balance / pot.target) * 100 : 0
          return (
            <div key={pot.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-base font-semibold">{pot.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {KIND_LABELS[pot.kind]}
                </span>
              </div>
              <p className="mb-3 text-2xl font-bold tabular-nums">{formatCurrency(projection.balance)}</p>

              {pot.target ? (
                <>
                  <ProgressBar pct={pct} />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Objetivo: {formatCurrency(pot.target)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {projection.reached
                      ? 'Objetivo atingido 🎉'
                      : projection.cyclesToTarget != null
                        ? `Ao ritmo atual (${formatCurrency(projection.avgContributionPerCycle)}/ciclo), atinge o objetivo em ${projection.cyclesToTarget} ${
                            projection.cyclesToTarget === 1 ? 'ciclo' : 'ciclos'
                          }`
                        : 'Sem progressão suficiente para projetar'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Sem objetivo definido</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
