export function progressColor(pct: number): string {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-orange-500'
  return 'bg-emerald-500'
}

/** Neutral goal-progress bar (pots) — plain track, no "remaining budget" framing. */
export default function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${progressColor(pct)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/**
 * Envelope spend bar — the yellow track region visually reads as "still
 * available per your plan"; the fill is the status-colored amount spent.
 */
export function BudgetBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-yellow-100">
      <div
        className={`h-full rounded-full transition-all ${progressColor(pct)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
