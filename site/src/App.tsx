import { useEffect, useState } from 'react'

import { DiagramShowcase } from '@aesthc/diagram-lib/showcase'
import { DEFAULT_SHOWCASE_ENTRIES } from '@aesthc/diagram-lib/showcase/entries'

type ThemeName = 'light' | 'dark'

export default function App() {
  const [theme, setTheme] = useState<ThemeName>('dark')
  const [locale, setLocale] = useState<'en' | 'es'>('en')
  const entries = useDebugEntries()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div>
      <header className="fixed right-4 top-4 z-50 flex gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
        <button
          type="button"
          className="border border-border bg-card px-3 py-1.5 text-foreground/70 hover:text-foreground"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        >
          {theme}
        </button>
        <button
          type="button"
          className="border border-border bg-card px-3 py-1.5 text-foreground/70 hover:text-foreground"
          onClick={() => setLocale((l) => (l === 'en' ? 'es' : 'en'))}
        >
          {locale}
        </button>
      </header>
      <DiagramShowcase locale={locale} entries={entries} />
    </div>
  )
}

/** `?only=example-band` narrows the page to one panel for visual debugging. */
function useDebugEntries() {
  const only = new URLSearchParams(window.location.search).get('only')
  if (!only) return DEFAULT_SHOWCASE_ENTRIES
  return DEFAULT_SHOWCASE_ENTRIES.filter((entry) => entry.key === only)
}
