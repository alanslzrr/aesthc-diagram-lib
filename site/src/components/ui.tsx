// Small mono-styled control primitives shared across the page. Everything
// follows the library's chrome: hairline borders, uppercase mono micro-type.

import { Component, useState, type ReactNode } from 'react'

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
        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-cobalt)]',
        active
          ? 'border-foreground/45 bg-foreground/8 text-foreground'
          : 'border-border bg-transparent text-foreground/55 hover:border-foreground/30 hover:text-foreground/85',
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
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--branch-ink)]">
            panel crashed — {this.state.error}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55 hover:text-foreground/85"
          >
            retry
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
