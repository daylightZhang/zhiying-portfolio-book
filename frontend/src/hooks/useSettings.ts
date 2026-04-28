import { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'zhiying-settings'

export interface Settings {
  holdingsPageSize: number
}

const DEFAULTS: Settings = {
  holdingsPageSize: 10,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

function save(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
})

export function useSettingsState(): SettingsContextValue {
  const [settings, setSettings] = useState<Settings>(load)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      save(next)
      return next
    })
  }, [])

  return { settings, update }
}

export function useSettings() {
  return useContext(SettingsContext)
}
