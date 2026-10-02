import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useThemePreference, validPreference, type ThemePreference } from '../../lib/theme'

export { useThemePreference, validPreference }
export type { ThemePreference }

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
