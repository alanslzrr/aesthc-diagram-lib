// Soft, Geist-styled controls shared across the playground.

import type { Locale } from '../content'
import { MESSAGES } from '../lib/messages'
import { Component, useEffect, useState, type ReactNode } from 'react'

/**
 * Control button in the host design system's own language: Geist, xs/medium,
 * normal case, hairline border, quiet muted hover — mono stays reserved for
 * source code, never for controls or interface labels.
 */
export function ControlButton({
  onClick,
  active,
  children,
  title,
  iconOnly,
}: {
  onClick: () => void
  /** Toggle/tab state; when provided it is also exposed as aria-pressed. */
  active?: boolean
  children: ReactNode
  title?: string
  iconOnly?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={iconOnly ? title : undefined}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'ui-control inline-flex rounded-md h-9 shrink-0 select-none items-center gap-1.5 whitespace-nowrap border px-2.5 text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 active:translate-y-px focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
        iconOnly ? 'icon-control' : '',
        active
          ? 'border-border bg-muted text-foreground'
          : 'border-transparent bg-transparent text-foreground/75 hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function CopyButton({
  locale = 'en',
  getText,
  label,
  copiedLabel,
  icon,
}: {
  locale?: Locale
  getText: () => string | Promise<string>
  label: string
  copiedLabel: string
  icon?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 4000)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <span aria-live="polite">
      <ControlButton
        onClick={() => {
          setError(null)
          Promise.resolve()
            .then(getText)
            .then((text) => navigator.clipboard.writeText(text))
            .then(() => {
              setCopied(true)
            })
            .catch(() => setError(MESSAGES.copyFailed[locale]))
        }}
      >
        {icon}
        {copied ? copiedLabel : label}
      </ControlButton>
      {error ? (
        <span role="alert" className="block text-[var(--branch-ink)]">
          {error}
        </span>
      ) : null}
    </span>
  )
}

/** Keeps one broken panel from unmounting the whole page. */
export class PanelBoundary extends Component<
  { children: ReactNode; locale?: Locale },
  { error: string | null }
> {
  state = { error: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.error !== null) {
      return (
        <div className="mt-6 border border-border px-5 py-14 text-center">
          <p className="text-xs font-medium text-[var(--branch-ink)]">
            {MESSAGES.panelFailed[this.props.locale ?? 'en']}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 ui-control inline-flex rounded-md h-9 items-center border border-border px-3 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
          >
            {MESSAGES.retry[this.props.locale ?? 'en']}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function SectionHeader({
  index,
  title,
  meta,
}: {
  index: number
  title: string
  meta: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
      <span className="font-sans text-sm font-medium tracking-normal text-foreground/75">
        <span aria-hidden="true" className="mr-3 font-sans text-xs text-muted-foreground">
          {index}
        </span>
        <span className="sr-only">{title}</span>
      </span>
      <span className="h-px flex-1 bg-foreground/16" />
      <span className="font-sans text-xs tracking-normal text-foreground/75">{meta}</span>
    </div>
  )
}
