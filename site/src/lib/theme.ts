import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export const validPreference = (value: unknown): ThemePreference =>
  value === 'light' || value === 'dark' ? value : 'system'

/** A theme flip restyles nearly every element; suppress the crossfade so it snaps. */
function suppressThemeTransitions() {
  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none !important}'
  document.head.append(style)
  void document.body.offsetWidth
  requestAnimationFrame(() => style.remove())
}

/**
 * Shared host preference for the landing, docs, playground, studio and viewer
 * chrome. Persisted under `adl-theme` and mirrored on <html data-theme>.
 * Document/export appearance is intentionally separate: exports follow the
 * document's own `presentation.theme.mode`, never this host preference.
 */
export function useThemePreference() {
  // Stable SSR markup; preference synchronizes only after hydration.
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = (value: ThemePreference) => {
      setPreference(value)
      document.documentElement.dataset.themePreference = value
      suppressThemeTransitions()
      document.documentElement.dataset.theme =
        value === 'system' ? (media.matches ? 'dark' : 'light') : value
      setTheme(document.documentElement.dataset.theme as 'light' | 'dark')
    }
    const read = () => {
      try {
        return validPreference(localStorage.getItem('adl-theme'))
      } catch {
        return validPreference(document.documentElement.dataset.themePreference)
      }
    }
    apply(read())
    const systemChanged = () => {
      if (document.documentElement.dataset.themePreference === 'system') apply('system')
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'adl-theme' || event.key === null) apply(read())
    }
    media.addEventListener('change', systemChanged)
    window.addEventListener('storage', storageChanged)
    const localChanged = () =>
      apply(validPreference(document.documentElement.dataset.themePreference))
    window.addEventListener('adl-theme-change', localChanged)
    return () => {
      media.removeEventListener('change', systemChanged)
      window.removeEventListener('storage', storageChanged)
      window.removeEventListener('adl-theme-change', localChanged)
    }
  }, [])
  function choose(value: ThemePreference) {
    setPreference(value)
    document.documentElement.dataset.themePreference = value
    suppressThemeTransitions()
    document.documentElement.dataset.theme =
      value === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : value
    window.dispatchEvent(new Event('adl-theme-change'))
    try {
      localStorage.setItem('adl-theme', value)
    } catch {
      /* In-memory preference remains usable. */
    }
  }
  return { preference, choose, theme }
}
