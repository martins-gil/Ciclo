import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getEnvelopes, getPots, getTransactions, addTransaction } from '../api/client'
import type { Transaction, TransactionType } from '../db/types'
import { X, Check } from 'lucide-react'
import { unlinkedPendingReimbursements } from '../lib/aggregate'
import { formatCurrency } from '../lib/currency'

const TYPE_LABELS: Record<TransactionType, string> = {
  spend: 'Despesa',
  transfer: 'Transferência',
  reimbursement_pending: 'Reembolso pendente',
  reimbursement_received: 'Reembolso recebido',
  income: 'Rendimento'
}

const TYPE_ORDER: TransactionType[] = [
  'spend',
  'income',
  'transfer',
  'reimbursement_pending',
  'reimbursement_received'
]

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AddTransaction({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const allEnvelopes = useQuery({ queryKey: ['envelopes'], queryFn: getEnvelopes }).data ?? []
  const allPots = useQuery({ queryKey: ['pots'], queryFn: getPots }).data ?? []
  const allTransactions = useQuery({ queryKey: ['transactions'], queryFn: getTransactions }).data ?? []
  const envelopes = useMemo(() => allEnvelopes.filter((e) => !e.archived), [allEnvelopes])
  const pots = useMemo(() => allPots.filter((p) => !p.archived), [allPots])

  const addTransactionMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    }
  })

  const [date, setDate] = useState(todayStr())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TransactionType>('spend')
  const [envelopeId, setEnvelopeId] = useState<number | null>(null)
  const [potId, setPotId] = useState<number | null>(null)
  const [toPotId, setToPotId] = useState<number | null>(null)
  const [isBaseIncome, setIsBaseIncome] = useState(true)
  const [linkedTransactionId, setLinkedTransactionId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (potId == null && pots.length > 0) {
      setPotId(pots.find((p) => p.kind === 'spending')?.id ?? pots[0].id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pots])

  const pendingReimbursements = useMemo(
    () => unlinkedPendingReimbursements(allTransactions),
    [allTransactions]
  )

  const amountNum = parseFloat(amount.replace(',', '.'))
  const amountValid = !Number.isNaN(amountNum) && amountNum > 0

  const needsEnvelope = type === 'spend' || type === 'reimbursement_pending'
  const needsSourcePot = type === 'spend' || type === 'transfer' || type === 'reimbursement_pending'
  const needsDestPot = type === 'transfer' || type === 'income' || type === 'reimbursement_received'

  const canSave =
    amountValid &&
    description.trim().length > 0 &&
    (!needsEnvelope || envelopeId != null) &&
    (!needsSourcePot || potId != null) &&
    (!needsDestPot || toPotIdOrPotId() != null) &&
    !(type === 'transfer' && potId != null && toPotId != null && potId === toPotId)

  function toPotIdOrPotId(): number | null {
    // transfer uses toPotId as destination; income/reimbursement_received use potId as destination
    if (type === 'transfer') return toPotId
    return potId
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const base: Omit<Transaction, 'id' | 'createdAt'> = {
        date,
        amount: Math.round(amountNum * 100) / 100,
        description: description.trim(),
        type
      }
      if (type === 'spend') {
        base.envelopeId = envelopeId
        base.potId = potId
      } else if (type === 'reimbursement_pending') {
        base.envelopeId = envelopeId
        base.potId = potId
      } else if (type === 'transfer') {
        base.potId = potId
        base.toPotId = toPotId
      } else if (type === 'income') {
        base.potId = potId
        base.isBaseIncome = isBaseIncome
      } else if (type === 'reimbursement_received') {
        base.potId = potId
        base.linkedTransactionId = linkedTransactionId
      }
      await addTransactionMutation.mutateAsync(base)
      onClose()
    } catch (e) {
      setError('Não foi possível guardar. Tenta novamente.')
      setSaving(false)
    }
  }

  function selectType(next: TransactionType) {
    setType(next)
    setEnvelopeId(null)
    setPotId(pots.find((p) => p.kind === 'spending')?.id ?? null)
    setToPotId(null)
    setLinkedTransactionId(null)
    if (next === 'reimbursement_pending') {
      const fuel = envelopes.find((e) => e.name.toLowerCase().includes('combust'))
      if (fuel?.id) setEnvelopeId(fuel.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 safe-top">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500" aria-label="Fechar">
          <X size={22} />
        </button>
        <h1 className="text-base font-semibold">Nova transação</h1>
        <div className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
        {/* Type selector */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Tipo
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => selectType(t)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border ${
                  type === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Valor (€)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-3xl font-semibold tabular-nums focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Date */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Descrição
          </label>
          <input
            type="text"
            placeholder="Ex: Supermercado Continente"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Envelope picker */}
        {needsEnvelope && (
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Envelope
            </label>
            <div className="grid grid-cols-2 gap-2">
              {envelopes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEnvelopeId(e.id!)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-medium ${
                    envelopeId === e.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {e.name}
                  {e.passthrough && <span className="ml-1 text-[10px] text-slate-400">(passthrough)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source pot picker */}
        {needsSourcePot && (
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {type === 'transfer' ? 'Origem' : 'Reserva'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pots.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPotId(p.id!)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-medium ${
                    potId === p.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Destination pot picker */}
        {needsDestPot && (
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {type === 'transfer' ? 'Destino' : 'Para a reserva'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pots
                .filter((p) => type !== 'transfer' || p.id !== potId)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => (type === 'transfer' ? setToPotId(p.id!) : setPotId(p.id!))}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-medium ${
                      (type === 'transfer' ? toPotId : potId) === p.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Income base/variable toggle */}
        {type === 'income' && (
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Natureza do rendimento
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsBaseIncome(true)}
                className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${
                  isBaseIncome
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Base (fixo)
              </button>
              <button
                onClick={() => setIsBaseIncome(false)}
                className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${
                  !isBaseIncome
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Variável
              </button>
            </div>
          </div>
        )}

        {/* Link to pending reimbursement */}
        {type === 'reimbursement_received' && (
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Associar a reembolso pendente (opcional)
            </label>
            {pendingReimbursements.length === 0 ? (
              <p className="text-sm text-slate-400">Sem reembolsos pendentes por associar.</p>
            ) : (
              <div className="space-y-2">
                {pendingReimbursements.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setLinkedTransactionId(linkedTransactionId === p.id ? null : p.id!)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm ${
                      linkedTransactionId === p.id
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{p.description} · {p.date}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          <Check size={20} />
          Guardar
        </button>
      </div>
    </div>
  )
}
