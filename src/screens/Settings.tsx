import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getEnvelopes,
  getPots,
  updateEnvelopeCap as apiUpdateEnvelopeCap,
  updatePotTarget as apiUpdatePotTarget,
  updateSettings as apiUpdateSettings,
  exportData,
  importData
} from '../api/client'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { Download, Upload, LogOut } from 'lucide-react'

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const { logout } = useAuth()
  const settings = useSettings()
  const envelopes = useQuery({ queryKey: ['envelopes'], queryFn: getEnvelopes }).data ?? []
  const pots = useQuery({ queryKey: ['pots'], queryFn: getPots }).data ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const settingsMutation = useMutation({
    mutationFn: apiUpdateSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  })
  const envelopeCapMutation = useMutation({
    mutationFn: ({ id, monthlyCap }: { id: number; monthlyCap: number }) => apiUpdateEnvelopeCap(id, monthlyCap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['envelopes'] })
  })
  const potTargetMutation = useMutation({
    mutationFn: ({ id, target }: { id: number; target: number | null }) => apiUpdatePotTarget(id, target),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pots'] })
  })

  function updateCycleStartDay(value: number) {
    if (Number.isNaN(value) || value < 1 || value > 28) return
    settingsMutation.mutate({ cycleStartDay: value })
  }

  function updateBaseIncomeDefault(value: number) {
    if (Number.isNaN(value) || value < 0) return
    settingsMutation.mutate({ baseIncomeDefault: value })
  }

  function updateEnvelopeCap(id: number, cap: number) {
    if (Number.isNaN(cap) || cap < 0) return
    envelopeCapMutation.mutate({ id, monthlyCap: cap })
  }

  function updatePotTarget(id: number, target: number | null) {
    potTargetMutation.mutate({ id, target })
  }

  async function handleExport() {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ciclo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(file: File) {
    setImportMessage(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data.envelopes) || !Array.isArray(data.pots) || !Array.isArray(data.transactions)) {
        throw new Error('Formato inválido')
      }
      const confirmed = window.confirm(
        'Isto substitui todos os dados atuais pelos dados do ficheiro. Continuar?'
      )
      if (!confirmed) return

      await importData(data)
      await queryClient.invalidateQueries()
      setImportMessage('Dados importados com sucesso.')
    } catch (e) {
      setImportMessage('Não foi possível importar o ficheiro. Verifica se é um backup válido do Ciclo.')
    }
  }

  return (
    <div className="safe-top px-4 pt-6 pb-8">
      <h1 className="mb-4 text-xl font-bold">Definições</h1>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ciclo</h2>
        <label className="mb-1 block text-sm text-slate-500">Dia de início do ciclo</label>
        <input
          type="number"
          min={1}
          max={28}
          defaultValue={settings.cycleStartDay}
          onBlur={(e) => updateCycleStartDay(parseInt(e.target.value, 10))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">Ex: 21 → ciclo corre do dia 21 ao dia 20 do mês seguinte</p>

        <label className="mb-1 mt-4 block text-sm text-slate-500">Rendimento base por defeito (€)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          defaultValue={settings.baseIncomeDefault}
          onBlur={(e) => updateBaseIncomeDefault(parseFloat(e.target.value))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Usado no cálculo de "seguro gastar hoje" quando ainda não há rendimento base lançado no ciclo
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Limites dos envelopes</h2>
        <div className="space-y-3">
          {envelopes.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">
                {e.name}
                {e.passthrough && <span className="ml-1 text-[10px] text-slate-400">(passthrough)</span>}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                defaultValue={e.monthlyCap}
                onBlur={(ev) => updateEnvelopeCap(e.id!, parseFloat(ev.target.value))}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Objetivos das reservas</h2>
        <div className="space-y-3">
          {pots.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">{p.name}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="sem objetivo"
                defaultValue={p.target ?? ''}
                onBlur={(ev) =>
                  updatePotTarget(p.id!, ev.target.value === '' ? null : parseFloat(ev.target.value))
                }
                className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Dados</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
          >
            <Download size={16} />
            Exportar JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
          >
            <Upload size={16} />
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {importMessage && <p className="mt-3 text-sm text-slate-500">{importMessage}</p>}
      </section>

      <button
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-500"
      >
        <LogOut size={16} />
        Sair
      </button>
    </div>
  )
}
