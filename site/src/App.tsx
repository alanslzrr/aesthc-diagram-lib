import { MESSAGES, savedLocale, saveLocale } from './lib/messages'
import { CloudArchitecture } from './components/CloudArchitecture'
import { useThemePreference } from './components/primitives/theme'
import { useEffect, useState } from 'react'

import type { DiagramSpec } from '@aesthc/diagram-lib'
import { registerExampleDiagrams } from '@aesthc/diagram-lib/examples'

import { decodeShareHash } from './lib/share'

import { Footer, Hero, QuickStart, TopBar } from './components/chrome'
import { DiagramPanel } from './components/DiagramPanel'
import { LayoutGallery } from './components/LayoutGallery'
import { ThemeStudio } from './components/ThemeStudio'
import { PanelBoundary, SectionHeader } from './components/ui'
import { SECTIONS, STRINGS, type Locale, type SectionEntry } from './content'

registerExampleDiagrams()

export default function App() {
  const { theme } = useThemePreference()
  useEffect(() => {
    document.documentElement.dataset.enhanced = 'true'
  }, [])
  const [locale, setLocale] = useState<Locale>(savedLocale)
  const only = useDebugEntry()
  const [shared, setShared] = useState<{ key: string; spec: DiagramSpec } | null>(null)
  const [shareError, setShareError] = useState(false)
  const [hydrated, setHydrated] = useState(!window.location.hash.includes('s='))

  useEffect(() => {
    if (hydrated) return
    void decodeShareHash(window.location.hash).then((decoded) => {
      if (decoded) {
        setShared({ key: decoded.key, spec: decoded.spec })
        setLocale(decoded.locale)
        window.setTimeout(() => {
          document.getElementById(decoded.key)?.scrollIntoView({ block: 'start' })
        }, 60)
      }
      setShareError(!decoded)
      setHydrated(true)
    })
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    const target = window.location.hash.slice(1)
    if (
      !['main', 'top', 'quick-start', 'cloud-architecture', 'theme-studio'].includes(target) &&
      !SECTIONS.some((entry) => entry.key === target)
    )
      return
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) document.getElementById(target)?.scrollIntoView({ block: 'start' })
    })
    return () => {
      cancelled = true
    }
  }, [hydrated])

  useEffect(() => {
    document.documentElement.lang = locale
    saveLocale(locale)
  }, [locale])

  return (
    <div className="pb-4">
      <a href="#main" className="skip-link">
        {MESSAGES.skip[locale]}
      </a>
      <TopBar
        locale={locale}
        onLocale={() => setLocale((current) => (current === 'en' ? 'es' : 'en'))}
      />

      <Hero locale={locale} theme={theme} only={only} />

      {shareError ? (
        <p role="alert" className="mx-auto max-w-4xl p-4">
          {MESSAGES.invalidShare[locale]}
        </p>
      ) : null}
      <main id="main" tabIndex={-1} className="mx-auto mt-12 w-full max-w-[1180px] px-4 sm:px-8">
        {only ? (
          <article id={only.key} className="border-t-0 py-2 first:pt-0">
            <a
              href={import.meta.env.BASE_URL}
              className="mb-3 inline-block text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
            >
              ← {MESSAGES.backToGallery[locale]}
            </a>
            <SectionHeader title={only.title[locale]} meta={only.key} />
            <h2 className="section-title text-foreground">{only.title[locale]}</h2>
            <p className="section-copy mt-3 max-w-[64ch] text-muted-foreground">
              {only.description[locale]}
            </p>

            <PanelBoundary locale={locale}>
              {hydrated ? (
                <div className="stage-wide">
                  <DiagramPanel
                    entry={only}
                    locale={locale}
                    sharedSpec={shared?.key === only.key ? shared.spec : undefined}
                  />
                </div>
              ) : null}
            </PanelBoundary>
          </article>
        ) : (
          <LayoutGallery locale={locale} />
        )}

        <CloudArchitecture locale={locale} />

        <article id="theme-studio" className="border-t border-border-subtle py-12">
          <SectionHeader title={STRINGS.themeTitle[locale]} meta="--cobalt · --branch" />
          <h2 className="section-title text-foreground">{STRINGS.themeTitle[locale]}</h2>
          <p className="section-copy mt-3 max-w-[64ch] text-muted-foreground">
            {STRINGS.themeIntro[locale]}
          </p>

          <ThemeStudio locale={locale} theme={theme} />
        </article>

        <QuickStart locale={locale} />
      </main>

      <Footer locale={locale} />
    </div>
  )
}

/** `?only=example-band` renders one full spec/code panel. */
function useDebugEntry(): SectionEntry | null {
  const only = new URLSearchParams(window.location.search).get('only')
  if (!only) return null
  return SECTIONS.find((entry) => entry.key === only) ?? null
}
