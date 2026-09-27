import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getEnvelopes, getTransactions } from '../api/client'
import { useSettings } from '../hooks/useSettings'
import { cycleIdToRange, listCycleIdsSince } from '../lib/cycle'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { transactionsInCycle, computeEnvelopeSpend } from '../lib/aggregate'
import { formatCurrency } from '../lib/currency'
import SubTabHeader from '../components/SubTabHeader'
import { TrendingUp } from 'lucide-react'

function countTrailingIncreases(series: number[]): number {
  let count = 0
  for (let i = series.length - 1; i > 0; i--) {
    if (series[i] > series[i - 1]) count++
    else break
  }
  return count
}

export default function Reports({
  onSwitchTab,
  activeSubTab
}: {
  onSwitchTab: (t: 'history' | 'reports') => void
  activeSubTab: 'history' | 'reports'
}) {
  const settings = useSettings()
  const envelopes = useQuery({ queryKey: ['envelopes'], queryFn: getEnvelopes }).data ?? []
  const allTransactions = useQuery({ queryKey: ['transactions'], queryFn: getTransactions }).data ?? []
  const activeEnvelopes = envelopes.filter((e) => !e.archived)

  const cycleIds = useMemo(() => {
    if (allTransactions.length === 0) return listCycleIdsSince(new Date(), settings.cycleStartDay)
    const earliest = allTransactions.reduce((min, t) => (t.date < min ? t.date : min), allTransactions[0].date)
    return listCycleIdsSince(new Date(earliest), settings.cycleStartDay)
  }, [allTransactions, settings.cycleStartDay])

  const chronological = [...cycleIds].reverse()

  const series = useMemo(
    () =>
      activeEnvelopes.map((envelope) => {
        const data = chronological.map((id) => {
          const range = cycleIdToRange(id, settings.cycleStartDay)
          const cTx = transactionsInCycle(allTransactions, range)
          const spent = computeEnvelopeSpend(cTx, envelope.id!)
          return { cycle: format(range.start, 'MMM', { locale: pt }), spent }
        })
        const values = data.map((d) => d.spent)
        const trendStreak = countTrailingIncreases(values)
        return { envelope, data, flagged: trendStreak >= 3 }
      }),
    [activeEnvelopes, chronological, allTransactions, settings.cycleStartDay]
  )

  return (
    <div className="safe-top px-4 pt-6">
      <h1 className="mb-4 text-xl font-bold">Ciclos</h1>
      <SubTabHeader active={activeSubTab} onChange={onSwitchTab} />

      <div className="space-y-4 pb-4">
        {series.map(({ envelope, data, flagged }) => (
          <div key={envelope.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{envelope.name}</span>
              {flagged && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                  <TrendingUp size={12} />
                  Tendência de subida
                </span>
              )}
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="cycle" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" width={40} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke={flagged ? '#ef4444' : '#4f46e5'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
