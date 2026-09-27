import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/client'
import { SETTINGS_ID, type Settings } from '../db/types'

const FALLBACK: Settings = {
  id: SETTINGS_ID,
  cycleStartDay: 21,
  currency: 'EUR',
  locale: 'pt-PT',
  baseIncomeDefault: 0
}

export function useSettings(): Settings {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  return data ?? FALLBACK
}
