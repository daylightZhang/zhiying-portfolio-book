import { useState, useEffect } from 'react'

export type ThemeId = 'aurora' | 'jade' | 'nebula' | 'abyss'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  preview: string  // CSS gradient for preview swatch
}

export const THEMES: ThemeOption[] = [
  { id: 'aurora', label: '极光', description: '明亮高级', preview: 'linear-gradient(135deg, #f0f4f8 0%, #ffffff 40%, #2563eb 100%)' },
  { id: 'jade', label: '翡翠', description: '明亮自然', preview: 'linear-gradient(135deg, #f5f5f0 0%, #ffffff 40%, #059669 100%)' },
  { id: 'nebula', label: '星轨', description: '酷炫暗色', preview: 'linear-gradient(135deg, #0c0a1d 0%, #151230 40%, #8b5cf6 100%)' },
  { id: 'abyss', label: '深海', description: '经典暗色', preview: 'linear-gradient(135deg, #0a1628 0%, #111d33 40%, #3b82f6 100%)' },
]

const STORAGE_KEY = 'zhiying_theme'
const DEFAULT_THEME: ThemeId = 'aurora'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return (saved as ThemeId) || DEFAULT_THEME
  })

  const setTheme = (id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem(STORAGE_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  return { theme, setTheme }
}
