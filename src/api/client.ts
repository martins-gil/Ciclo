import type { Envelope, Pot, Transaction, Settings } from '../db/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  })
  if (!res.ok) {
    let message = `Pedido falhou (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---- auth ----
export function login(password: string): Promise<{ ok: true }> {
  return request('auth/login', { method: 'POST', body: JSON.stringify({ password }) })
}
export function logout(): Promise<{ ok: true }> {
  return request('auth/logout', { method: 'POST' })
}
export function checkAuth(): Promise<{ authenticated: boolean }> {
  return request('auth/me')
}

// ---- envelopes ----
export function getEnvelopes(): Promise<Envelope[]> {
  return request('envelopes')
}
export function updateEnvelopeCap(id: number, monthlyCap: number): Promise<Envelope> {
  return request(`envelopes?id=${id}`, { method: 'PATCH', body: JSON.stringify({ monthlyCap }) })
}

// ---- pots ----
export function getPots(): Promise<Pot[]> {
  return request('pots')
}
export function updatePotTarget(id: number, target: number | null): Promise<Pot> {
  return request(`pots?id=${id}`, { method: 'PATCH', body: JSON.stringify({ target }) })
}

// ---- transactions ----
export function getTransactions(): Promise<Transaction[]> {
  return request('transactions')
}
export function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  return request('transactions', { method: 'POST', body: JSON.stringify(data) })
}

// ---- settings ----
export function getSettings(): Promise<Settings> {
  return request('settings')
}
export function updateSettings(data: Partial<Pick<Settings, 'cycleStartDay' | 'baseIncomeDefault'>>): Promise<Settings> {
  return request('settings', { method: 'PATCH', body: JSON.stringify(data) })
}

// ---- backup ----
export interface ExportPayload {
  exportedAt: string
  envelopes: Envelope[]
  pots: Pot[]
  transactions: Transaction[]
  settings: Settings[]
}
export function exportData(): Promise<ExportPayload> {
  return request('export')
}
export function importData(data: unknown): Promise<{ ok: true }> {
  return request('import', { method: 'POST', body: JSON.stringify(data) })
}
