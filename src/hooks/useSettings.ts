import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { SETTINGS_ID, type Settings } from '../db/types'

const FALLBACK: Settings = {
  id: SETTINGS_ID,
  cycleStartDay: 21,
  currency: 'EUR',
  locale: 'pt-PT',
  baseIncomeDefault: 0
}

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID), [])
  return settings ?? FALLBACK
}
