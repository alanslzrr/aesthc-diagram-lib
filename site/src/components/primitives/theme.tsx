import { useEffect, useState } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'

export type ThemePreference = 'system' | 'light' | 'dark'
export const validPreference = (value: unknown): ThemePreference =>
  value === 'light' || value === 'dark' ? value : 'system'
export function useThemePreference() {
  // Stable SSR markup; preference synchronizes only after hydration.
  const [preference, setPreference] = useState<ThemePreference>('system')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = (value: ThemePreference) => {
      setPreference(value)
      document.documentElement.dataset.themePreference = value
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
export function ThemeSelector({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const { preference, choose } = useThemePreference()
  const labels = locale === 'es' ? ['Sistema', 'Claro', 'Oscuro'] : ['System', 'Light', 'Dark']
  return (
    <ToggleGroup.Root
      type="single"
      value={preference}
      onValueChange={(value) => {
        if (value) choose(validPreference(value))
      }}
      className="theme-selector"
      aria-label={locale === 'es' ? 'Tema' : 'Theme'}
    >
      {(['system', 'light', 'dark'] as const).map((value, index) => (
        <ToggleGroup.Item
          key={value}
          value={value}
          aria-label={labels[index]}
          title={labels[index]}
          className="theme-option"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {value === 'system' ? (
              <>
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8m-4-4v4" />
              </>
            ) : value === 'light' ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </>
            ) : (
              <path d="M21 12.8A9 9 0 0 1 11.2 3a9 9 0 1 0 9.8 9.8Z" />
            )}
          </svg>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
