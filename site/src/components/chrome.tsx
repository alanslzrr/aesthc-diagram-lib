import { GitHubIcon } from './primitives/icons'
import { ScrollArea } from './primitives/ScrollArea'
import { ThemeSelector } from './primitives/theme'
import { Disclosure, DisclosureTrigger, DisclosureContent } from './primitives/Disclosure'
import { InstallCommand } from './InstallCommand'
// Page chrome: fixed top bar, hero, quick start and footer.

import { MESSAGES } from '../lib/messages'
import { PACKAGE_VERSION } from '../generated/quick-start'
import type { Locale } from '../content'
import { FEATURES, GITHUB_URL, QUICK_START, SECTIONS, STRINGS } from '../content'
import { CopyButton, ControlButton, SectionHeader } from './ui'

export function TopBar({ locale, onLocale }: { locale: Locale; onLocale: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-[color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-md">
      <div className="site-header-inner mx-auto flex w-full max-w-[1180px] flex-wrap gap-3 items-center justify-between px-4 py-2 sm:px-8">
        <a
          href="#top"
          className="site-brand inline-flex items-center gap-3 text-foreground/80 transition-colors hover:text-foreground"
        >
          <span className="sm:hidden">aesthc</span>
          <span className="hidden sm:inline">aesthc / diagrams</span>
        </a>
        <nav
          aria-label={locale === 'es' ? 'Navegación principal' : 'Main navigation'}
          className="inline-flex flex-wrap items-center gap-2"
        >
          <a
            className="text-xs underline underline-offset-4"
            href={`${import.meta.env.BASE_URL}docs/`}
          >
            Docs
          </a>
          <a
            className="hidden text-xs underline underline-offset-4 sm:inline"
            href={`${import.meta.env.BASE_URL}agents/`}
          >
            Agents
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="github-link inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
          >
            <GitHubIcon />
          </a>
          <ThemeSelector locale={locale} />
          <ControlButton onClick={onLocale} title={STRINGS.localeTooltip[locale]}>
            {locale === 'en' ? 'EN' : 'ES'}
          </ControlButton>
        </nav>
      </div>
    </header>
  )
}

export function Hero({ locale, theme }: { locale: Locale; theme: 'light' | 'dark' }) {
  return (
    <div className="site-hero" id="top">
      <p className="text-xs tracking-normal text-muted-foreground">{STRINGS.label[locale]}</p>
      <h1 className="hero-heading">
        {STRINGS.heading[locale]}{' '}
        <span className="text-foreground">{STRINGS.headingAccent[locale]}</span>
      </h1>
      <p className="hero-intro">{STRINGS.intro[locale]}</p>

      <a
        href="#example-band"
        className="mt-5 block rounded-md border border-border overflow-hidden"
        aria-label={
          locale === 'es'
            ? 'Explorar este diagrama interactivo'
            : 'Explore this interactive diagram'
        }
      >
        <img
          src={`${import.meta.env.BASE_URL}diagram-preview-${theme}.png`}
          width="996"
          height="333"
          alt={
            locale === 'es'
              ? 'Flujo de ingreso, validación y aprobación con un camino de cuarentena'
              : 'Ingress, validation and approval flow with a quarantine path'
          }
          className="w-full h-auto"
          fetchPriority="high"
        />
      </a>
      <InstallCommand locale={locale} />
      <nav
        aria-label={locale === 'es' ? 'Explorar la biblioteca' : 'Explore the library'}
        className="mt-5 flex flex-wrap gap-4 text-sm underline underline-offset-4"
      >
        <a href="#quick-start">{STRINGS.quickStartTitle[locale]}</a>
        <a href="#cloud-architecture">
          {locale === 'es' ? 'Arquitecturas reales' : 'Real architectures'}
        </a>
        <a href="#theme-studio">{STRINGS.themeTitle[locale]}</a>
      </nav>
      <nav
        aria-label={locale === 'es' ? 'Tipos de diagrama' : 'Diagram types'}
        className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
      >
        {SECTIONS.map((entry) => (
          <a key={entry.key} href={`#${entry.key}`} className="underline underline-offset-4">
            {entry.title[locale]}
          </a>
        ))}
      </nav>

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/75">
        {[
          'ESM',
          'React 18.3.1 / 19',
          'TypeScript',
          locale === 'es' ? '7 diseños' : '7 layouts',
          'en · es',
        ].map((badge) => (
          <li key={badge} className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-foreground/30" />
            {badge}
          </li>
        ))}
      </ul>

      <Disclosure className="mt-8">
        <DisclosureTrigger className="cursor-pointer text-sm">
          {locale === 'es' ? 'Capacidades' : 'Capabilities'} · v{PACKAGE_VERSION}
        </DisclosureTrigger>
        <DisclosureContent>
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
        </DisclosureContent>
      </Disclosure>
      <a href="#main" className="mt-5 inline-block text-sm underline underline-offset-4">
        {locale === 'es' ? 'Explorar diagramas ↓' : 'Explore diagrams ↓'}
      </a>
    </div>
  )
}

export function QuickStart({ locale, index }: { locale: Locale; index: number }) {
  return (
    <article id="quick-start" className="border-t border-foreground/20 py-12">
      <SectionHeader index={index} title={STRINGS.quickStartTitle[locale]} meta="readme" />
      <h2 className="section-title text-foreground">{STRINGS.quickStartTitle[locale]}</h2>
      <p className="section-copy mt-3 max-w-[64ch] text-foreground/74">
        {STRINGS.quickStartIntro[locale]}
      </p>

      <Disclosure className="mt-6">
        <DisclosureTrigger>
          {locale === 'es' ? 'Ejemplo React completo' : 'Complete React example'}
        </DisclosureTrigger>
        <DisclosureContent>
          <div className="relative mt-6 overflow-hidden rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="font-sans text-xs tracking-normal text-foreground/75">
                quick-start.tsx
              </span>
              <CopyButton
                locale={locale}
                label={STRINGS.copy[locale]}
                copiedLabel={STRINGS.copied[locale]}
                getText={() => QUICK_START}
              />
            </div>
            <ScrollArea orientation="horizontal" label={MESSAGES.integration[locale]}>
              {' '}
              <pre className="p-5 font-mono text-[13px] leading-[1.7] text-foreground/85">
                {QUICK_START}
              </pre>
            </ScrollArea>
          </div>
        </DisclosureContent>
      </Disclosure>
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
            aria-label="GitHub"
            title="GitHub"
            className="transition-colors hover:text-foreground"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon />
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
