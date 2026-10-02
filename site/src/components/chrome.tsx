import { useState } from 'react'
import { GitHubIcon } from './primitives/icons'
import { ScrollArea } from './primitives/ScrollArea'
import { ThemeSelector } from './primitives/theme'
import { InstallCommand } from './InstallCommand'
// Page chrome: fixed top bar, hero, quick start and footer.

import { MESSAGES } from '../lib/messages'
import { PACKAGE_VERSION } from '../generated/quick-start'
import type { Locale } from '../content'
import { FEATURES, GITHUB_URL, QUICK_START, SECTIONS, STRINGS } from '../content'
import { CopyButton, ControlButton, SectionHeader } from './ui'

export function TopBar({ locale, onLocale }: { locale: Locale; onLocale: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border-subtle bg-background">
      <div className="site-header-inner mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-8">
        <a
          href="#top"
          className="site-brand inline-flex items-center gap-3 text-foreground/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
        >
          <span className="sm:hidden">aesthc</span>
          <span className="hidden sm:inline">aesthc / diagrams</span>
        </a>
        <nav
          aria-label={locale === 'es' ? 'Navegación principal' : 'Main navigation'}
          className="inline-flex flex-wrap items-center gap-1"
        >
          <a
            className="header-link inline-flex h-9 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground"
            href={`${import.meta.env.BASE_URL}docs/`}
          >
            Docs
          </a>
          <a
            className="header-link hidden h-9 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground sm:inline-flex"
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
            className="github-link inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/75 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground"
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
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="font-sans text-xs font-medium text-muted-foreground">
            {STRINGS.label[locale]}
          </p>
          <h1 className="hero-heading">
            {STRINGS.heading[locale]}{' '}
            <span className="text-foreground">{STRINGS.headingAccent[locale]}</span>
          </h1>
          <p className="hero-intro">{STRINGS.intro[locale]}</p>
          <div className="hero-actions">
            <a className="hero-cta" href={`${import.meta.env.BASE_URL}docs/getting-started/`}>
              {STRINGS.getStarted[locale]}
            </a>
            <a className="hero-cta-secondary" href={`${import.meta.env.BASE_URL}playground.html`}>
              {STRINGS.openPlaygroundCta[locale]} ↗
            </a>
          </div>
          <InstallCommand locale={locale} />
        </div>

        <a
          href="#example-band"
          className="hero-media group"
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
            className="h-auto w-full border-b border-border-subtle transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:opacity-95"
            fetchPriority="high"
          />
        </a>
      </div>
      <div className="hero-copy hero-meta">
        <nav
          aria-label={locale === 'es' ? 'Explorar la biblioteca' : 'Explore the library'}
          className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          {[
            { href: '#quick-start', label: STRINGS.quickStartTitle[locale] },
            {
              href: '#cloud-architecture',
              label: locale === 'es' ? 'Arquitecturas reales' : 'Real architectures',
            },
            { href: '#theme-studio', label: STRINGS.themeTitle[locale] },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <nav
          aria-label={locale === 'es' ? 'Tipos de diagrama' : 'Diagram types'}
          className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-sm"
        >
          {SECTIONS.map((entry) => (
            <a
              key={entry.key}
              href={`#${entry.key}`}
              className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-border hover:bg-muted hover:text-foreground"
            >
              {entry.title[locale]}
            </a>
          ))}
        </nav>

        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {[
            'ESM',
            'React 18.3.1 / 19',
            'TypeScript',
            locale === 'es' ? '7 diseños' : '7 layouts',
            'en · es',
          ].map((badge) => (
            <li key={badge} className="inline-flex items-center gap-2">
              <i
                aria-hidden="true"
                className="inline-block h-1 w-1 rounded-full bg-foreground/30"
              />
              {badge}
            </li>
          ))}
        </ul>

        <section
          id="capabilities"
          className="mt-10"
          aria-label={locale === 'es' ? 'Capacidades' : 'Capabilities'}
        >
          <h2 className="text-xs font-medium text-foreground/80">
            {locale === 'es' ? 'Capacidades' : 'Capabilities'} · v{PACKAGE_VERSION}
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-6 border-t border-border-subtle pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.label.en}>
                <dt className="text-xs font-medium text-foreground/80">{feature.label[locale]}</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {feature.detail[locale]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <a
          href="#main"
          className="mt-6 inline-block text-sm text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
        >
          {locale === 'es' ? 'Explorar diagramas ↓' : 'Explore diagrams ↓'}
        </a>
      </div>
    </div>
  )
}

export function QuickStart({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  return (
    <article id="quick-start" className="border-t border-border-subtle py-12">
      <SectionHeader title={STRINGS.quickStartTitle[locale]} meta="readme" />
      <h2 className="section-title text-foreground">{STRINGS.quickStartTitle[locale]}</h2>
      <p className="section-copy mt-3 max-w-[64ch] text-muted-foreground">
        {STRINGS.quickStartIntro[locale]}
      </p>

      <button
        type="button"
        className="ui-control mt-6 inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground/75 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted hover:text-foreground"
        aria-expanded={open}
        aria-controls="quick-start-example"
        onClick={() => setOpen((value) => !value)}
      >
        {open
          ? locale === 'es'
            ? 'Ocultar ejemplo'
            : 'Hide example'
          : locale === 'es'
            ? 'Ver ejemplo React completo'
            : 'Show complete React example'}
      </button>
      <div id="quick-start-example" hidden={!open}>
        <div className="relative mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
            <span className="font-sans text-xs font-medium text-muted-foreground">
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
      </div>
    </article>
  )
}

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 py-10 text-xs text-muted-foreground sm:px-8">
        <span>© 2026 Alan Salazar · {STRINGS.footerNote[locale]}</span>
        <span className="inline-flex flex-wrap items-center gap-5 font-medium">
          <a
            aria-label="GitHub"
            title="GitHub"
            className="transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon />
          </a>
          <a
            className="transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
            href={`${GITHUB_URL}#readme`}
            target="_blank"
            rel="noreferrer"
          >
            {STRINGS.readme[locale]} ↗
          </a>
          <a
            className="transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-foreground"
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
