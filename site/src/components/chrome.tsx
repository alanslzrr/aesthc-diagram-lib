import { InstallCommand } from './InstallCommand'
// Page chrome: fixed top bar, hero, quick start and footer.

import { PACKAGE_VERSION } from '../generated/quick-start'
import type { Locale } from '../content'
import { FEATURES, GITHUB_URL, QUICK_START, STRINGS } from '../content'
import { CopyButton, ControlButton, SectionHeader } from './ui'

export function TopBar({
  locale,
  theme,
  onLocale,
  onTheme,
}: {
  locale: Locale
  theme: 'light' | 'dark'
  onLocale: () => void
  onTheme: () => void
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-[color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap gap-3 items-center justify-between px-4 py-3 sm:px-8">
        <a
          href="#top"
          className="inline-flex items-center gap-3 font-sans text-[13px] tracking-[-0.02em] text-foreground/80 transition-colors hover:text-foreground"
        >
          <i className="inline-block h-[7px] w-[7px] rounded-full bg-cobalt shadow-[0_0_8px_color-mix(in_srgb,var(--color-cobalt)_55%,transparent)]" />
          @aesthc/diagram-lib
        </a>
        <nav aria-label="Main navigation" className="inline-flex flex-wrap items-center gap-2">
          <a
            className="text-xs underline underline-offset-4"
            href={`${import.meta.env.BASE_URL}docs/`}
          >
            Docs
          </a>
          <a
            className="text-xs underline underline-offset-4"
            href={`${import.meta.env.BASE_URL}agents/`}
          >
            Agents
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-xl h-9 items-center gap-1.5 border border-border px-2.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
          >
            GitHub ↗
          </a>
          <ControlButton onClick={onTheme} title={STRINGS.themeTooltip[locale]}>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </ControlButton>
          <ControlButton onClick={onLocale} title={STRINGS.localeTooltip[locale]}>
            {locale === 'en' ? 'EN' : 'ES'}
          </ControlButton>
        </nav>
      </div>
    </header>
  )
}

export function Hero({ locale }: { locale: Locale }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-32 sm:px-8" id="top">
      <p className="text-xs tracking-normal text-muted-foreground">{STRINGS.label[locale]}</p>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,4.5vw,4rem)] leading-[0.98] tracking-[-0.04em]">
        {STRINGS.heading[locale]}{' '}
        <span className="italic text-[var(--cobalt-ink)]">{STRINGS.headingAccent[locale]}</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        {STRINGS.intro[locale]}
      </p>

      <InstallCommand locale={locale} />

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/75">
        {['MIT', 'ESM', 'React ≥ 18', 'TypeScript', '7 layouts', 'en · es'].map((badge) => (
          <li key={badge} className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-foreground/30" />
            {badge}
          </li>
        ))}
      </ul>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm">
          {locale === 'es' ? 'Capacidades' : 'Capabilities'} · v{PACKAGE_VERSION}
        </summary>
        <dl className="mt-4 grid gap-x-8 gap-y-6 border-t border-foreground/16 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.label.en}>
              <dt className="text-xs font-medium text-foreground/80">{feature.label[locale]}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-foreground/75">
                {feature.detail[locale]}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <a href="#main" className="mt-5 inline-block text-sm underline underline-offset-4">
        {locale === 'es' ? 'Explorar diagramas ↓' : 'Explore diagrams ↓'}
      </a>
    </div>
  )
}

export function QuickStart({ locale, index }: { locale: Locale; index: number }) {
  return (
    <article className="border-t border-foreground/20 py-16">
      <SectionHeader index={index} title={STRINGS.quickStartTitle[locale]} meta="readme" />
      <h2 className="font-display text-[clamp(1.8rem,2.6vw,2.4rem)] leading-tight tracking-[-0.03em] text-foreground">
        {STRINGS.quickStartTitle[locale]}
      </h2>
      <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74">
        {STRINGS.quickStartIntro[locale]}
      </p>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))]">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-sans text-xs tracking-normal text-foreground/75">
            quick-start.tsx
          </span>
          <CopyButton
            label={STRINGS.copy[locale]}
            copiedLabel={STRINGS.copied[locale]}
            getText={() => QUICK_START}
          />
        </div>
        <pre
          tabIndex={0}
          role="region"
          aria-label="Quick start code"
          className="overflow-x-auto p-5 font-mono text-[11.5px] leading-[1.7] text-foreground/85"
        >
          {QUICK_START}
        </pre>
      </div>
    </article>
  )
}

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-foreground/20">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 py-10 text-xs text-foreground/75 sm:px-8">
        <span>© 2026 Alan Salazar · {STRINGS.footerNote[locale]}</span>
        <span className="inline-flex flex-wrap items-center gap-5 font-medium">
          <a
            className="transition-colors hover:text-foreground"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="transition-colors hover:text-foreground"
            href={`${GITHUB_URL}#readme`}
            target="_blank"
            rel="noreferrer"
          >
            {STRINGS.readme[locale]} ↗
          </a>
          <a
            className="transition-colors hover:text-foreground"
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
          >
            {STRINGS.license[locale]} ↗
          </a>
        </span>
      </div>
    </footer>
  )
}
