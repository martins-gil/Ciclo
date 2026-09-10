export default function SubTabHeader({
  active,
  onChange
}: {
  active: 'history' | 'reports'
  onChange: (tab: 'history' | 'reports') => void
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button
        onClick={() => onChange('history')}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
          active === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
        }`}
      >
        Histórico
      </button>
      <button
        onClick={() => onChange('reports')}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
          active === 'reports' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
        }`}
      >
        Relatórios
      </button>
    </div>
  )
}
