import { addMonths, subDays, differenceInCalendarDays, differenceInCalendarMonths, format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

export interface CycleRange {
  id: string // 'yyyy-MM' of the cycle's start month, sortable
  start: Date
  end: Date
}

function atMidnight(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

/** Cycle runs from `startDay` of one month to `startDay - 1` of the next. */
export function getCycleRange(date: Date, startDay: number): CycleRange {
  const d = atMidnight(date)
  const day = d.getDate()
  let start: Date
  if (day >= startDay) {
    start = new Date(d.getFullYear(), d.getMonth(), startDay)
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, startDay)
  }
  const end = subDays(addMonths(start, 1), 1)
  return { id: format(start, 'yyyy-MM'), start, end }
}

export function getCurrentCycle(startDay: number): CycleRange {
  return getCycleRange(new Date(), startDay)
}

export function cycleIdToRange(cycleId: string, startDay: number): CycleRange {
  const [y, m] = cycleId.split('-').map(Number)
  const start = new Date(y, m - 1, startDay)
  const end = subDays(addMonths(start, 1), 1)
  return { id: cycleId, start, end }
}

export function dateStringToCycleId(dateStr: string, startDay: number): string {
  return getCycleRange(parseISO(dateStr), startDay).id
}

export function isDateStringInCycle(dateStr: string, cycle: CycleRange): boolean {
  const d = atMidnight(parseISO(dateStr))
  return d >= cycle.start && d <= cycle.end
}

export function daysRemainingInCycle(cycle: CycleRange, today: Date = new Date()): number {
  const t = atMidnight(today)
  if (t > cycle.end) return 0
  if (t < cycle.start) return totalDaysInCycle(cycle)
  return differenceInCalendarDays(cycle.end, t) + 1
}

export function totalDaysInCycle(cycle: CycleRange): number {
  return differenceInCalendarDays(cycle.end, cycle.start) + 1
}

export function daysElapsedInCycle(cycle: CycleRange, today: Date = new Date()): number {
  return totalDaysInCycle(cycle) - daysRemainingInCycle(cycle, today)
}

export function formatCycleLabel(cycle: CycleRange): string {
  const startFmt = format(cycle.start, 'd MMM', { locale: pt })
  const endFmt = format(cycle.end, 'd MMM yyyy', { locale: pt })
  return `${startFmt} – ${endFmt}`
}

/** Most recent `count` cycle ids, newest first, ending with the cycle containing `reference`. */
export function listRecentCycleIds(count: number, startDay: number, reference: Date = new Date()): string[] {
  const ids: string[] = []
  let cursor = getCycleRange(reference, startDay)
  for (let i = 0; i < count; i++) {
    ids.push(cursor.id)
    const prevRef = subDays(cursor.start, 1)
    cursor = getCycleRange(prevRef, startDay)
  }
  return ids
}

/** All cycle ids, newest first, from the current cycle back through the one containing `earliestDate`. */
export function listCycleIdsSince(earliestDate: Date, startDay: number, maxCycles = 36): string[] {
  const current = getCurrentCycle(startDay)
  const earliest = getCycleRange(earliestDate, startDay)
  const span = Math.max(differenceInCalendarMonths(current.start, earliest.start) + 1, 1)
  return listRecentCycleIds(Math.min(span, maxCycles), startDay)
}
