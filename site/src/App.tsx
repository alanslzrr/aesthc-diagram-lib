import { useEffect, useState } from 'react'

import type { DiagramSpec } from '@aesthc/diagram-lib'
import { registerExampleDiagrams } from '@aesthc/diagram-lib/examples'

import { decodeShareHash } from './lib/share'

import { Footer, Hero, QuickStart, TopBar } from './components/chrome'
import { DiagramPanel } from './components/DiagramPanel'
import { ThemeStudio } from './components/ThemeStudio'
import { PanelBoundary, SectionHeader } from './components/ui'
import { SECTIONS, STRINGS, type Locale } from './content'

registerExampleDiagrams()

type ThemeName = 'light' | 'dark'

/** The boot script in index.html already stamped the pre-paint theme. */
const initialTheme = (): ThemeName =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(initialTheme)
  const [locale, setLocale] = useState<Locale>('en')
  const sections = useDebugSections()
  const [shared, setShared] = useState<{ key: string; spec: DiagramSpec } | null>(null)
  const [hydrated, setHydrated] = useState(!window.location.hash.includes('s='))

  useEffect(() => {
    if (hydrated) return
    void decodeShareHash(window.location.hash).then((decoded) => {
      if (decoded) {
        setShared({ key: decoded.key, spec: decoded.spec as DiagramSpec })
        window.setTimeout(() => {
          document.getElementById(decoded.key)?.scrollIntoView({ block: 'start' })
        }, 60)
      }
      setHydrated(true)
    })
  }, [hydrated])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('adl-theme', theme)
    } catch {
      /* private mode */
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <div className="pb-4">
      <TopBar
        locale={locale}
        theme={theme}
        onLocale={() => setLocale((current) => (current === 'en' ? 'es' : 'en'))}
        onTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <Hero locale={locale} />

      <main className="mx-auto mt-20 w-full max-w-[1180px] px-4 sm:px-8">
        {sections.map((entry, index) => (
          <article
            key={entry.key}
            id={entry.key}
            className="border-t border-foreground/20 py-16 first:border-t-0 first:pt-0"
          >
            <SectionHeader index={index + 1} title={entry.title[locale]} meta={entry.key} />
            <h2 className="font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight tracking-[-0.03em] text-foreground">
              {entry.title[locale]}
            </h2>
            <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74">
              {entry.description[locale]}
            </p>

            <PanelBoundary>
              {hydrated ? (
                <DiagramPanel
                  entry={entry}
                  locale={locale}
                  sharedSpec={shared?.key === entry.key ? shared.spec : undefined}
                />
              ) : null}
            </PanelBoundary>
          </article>
        ))}

        <article className="border-t border-foreground/20 py-16">
          <SectionHeader
            index={sections.length + 1}
            title={STRINGS.themeTitle[locale]}
            meta="--cobalt · --branch"
          />
          <h2 className="font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight tracking-[-0.03em] text-foreground">
            {STRINGS.themeTitle[locale]}
          </h2>
          <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74">
            {STRINGS.themeIntro[locale]}
          </p>

          <ThemeStudio locale={locale} theme={theme} />
        </article>

        <QuickStart locale={locale} index={sections.length + 2} />
      </main>

      <Footer locale={locale} />
    </div>
  )
}

/** `?only=example-band` narrows the page to one panel for visual debugging. */
function useDebugSections() {
  const only = new URLSearchParams(window.location.search).get('only')
  if (!only) return SECTIONS
  const match = SECTIONS.filter((entry) => entry.key === only)
  return match.length > 0 ? match : SECTIONS
}
