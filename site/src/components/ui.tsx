// Small mono-styled control primitives shared across the page. Everything
// follows the library's chrome: hairline borders, uppercase mono micro-type.

import { Component, useState, type ReactNode } from 'react'

/**
 * Control button in the host design system's own language: Sora, xs/medium,
 * normal case, hairline border, quiet muted hover — mono stays reserved for
 * technical micro-labels (keys, captions, code), never for controls.
 */
export function MonoButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  /** Toggle/tab state; when provided it is also exposed as aria-pressed. */
  active?: boolean
  children: ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'inline-flex h-7 shrink-0 select-none items-center gap-1.5 whitespace-nowrap border px-2.5 text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 active:translate-y-px focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
        active
          ? 'border-foreground/40 bg-muted text-foreground'
          : 'border-border bg-transparent text-foreground/60 hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function CopyButton({
  getText,
  label,
  copiedLabel,
}: {
  getText: () => string
  label: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <span aria-live="polite">
      <MonoButton
        onClick={() => {
          navigator.clipboard
            .writeText(getText())
            .then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            })
            .catch(() => {
              /* clipboard denied — leave the label untouched */
            })
        }}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block h-[6px] w-[6px] rounded-full transition-colors duration-150',
            copied ? 'bg-cobalt' : 'bg-foreground/30',
          ].join(' ')}
        />
        {copied ? copiedLabel : label}
      </MonoButton>
    </span>
  )
}

/** Keeps one broken panel from unmounting the whole page. */
export class PanelBoundary extends Component<
  { children: ReactNode },
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
            The panel crashed — {this.state.error}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 inline-flex h-7 items-center border border-border px-3 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            Retry
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
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
        {String(index).padStart(2, '0')} — {title}
      </span>
      <span className="h-px flex-1 bg-foreground/16" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/45">
        {meta}
      </span>
    </div>
  )
}
