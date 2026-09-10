import { useEffect, useState } from 'react'
import { ensureSeeded } from './db/db'
import Dashboard from './screens/Dashboard'
import PotsDetail from './screens/PotsDetail'
import CycleHistory from './screens/CycleHistory'
import Reports from './screens/Reports'
import SettingsScreen from './screens/Settings'
import AddTransaction from './screens/AddTransaction'
import { LayoutGrid, Wallet, History, Settings as SettingsIcon, Plus } from 'lucide-react'

type Tab = 'dashboard' | 'pots' | 'cycles' | 'settings'

export default function App() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [cyclesSubTab, setCyclesSubTab] = useState<'history' | 'reports'>('history')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    ensureSeeded().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
        A carregar…
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'dashboard' && <Dashboard onAdd={() => setAddOpen(true)} />}
        {tab === 'pots' && <PotsDetail />}
        {tab === 'cycles' && cyclesSubTab === 'history' && (
          <CycleHistory onSwitchTab={setCyclesSubTab} activeSubTab={cyclesSubTab} />
        )}
        {tab === 'cycles' && cyclesSubTab === 'reports' && (
          <Reports onSwitchTab={setCyclesSubTab} activeSubTab={cyclesSubTab} />
        )}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md grid grid-cols-5 items-center px-2 pb-[env(safe-area-inset-bottom)]">
          <NavButton label="Início" active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
            <LayoutGrid size={22} />
          </NavButton>
          <NavButton label="Reservas" active={tab === 'pots'} onClick={() => setTab('pots')}>
            <Wallet size={22} />
          </NavButton>

          <div className="flex justify-center">
            <button
              onClick={() => setAddOpen(true)}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition"
              aria-label="Adicionar transação"
            >
              <Plus size={26} />
            </button>
          </div>

          <NavButton label="Ciclos" active={tab === 'cycles'} onClick={() => setTab('cycles')}>
            <History size={22} />
          </NavButton>
          <NavButton label="Definições" active={tab === 'settings'} onClick={() => setTab('settings')}>
            <SettingsIcon size={22} />
          </NavButton>
        </div>
      </nav>

      {addOpen && <AddTransaction onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function NavButton({
  label,
  active,
  onClick,
  children
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      {children}
      {label}
    </button>
  )
}
