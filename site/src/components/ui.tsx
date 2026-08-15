// Small mono-styled control primitives shared across the page. Everything
// follows the library's chrome: hairline borders, uppercase mono micro-type.

import { useState, type ReactNode } from 'react'

export function MonoButton({
  onClick,
  active = false,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150',
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
    <MonoButton
      onClick={() => {
        void navigator.clipboard.writeText(getText()).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
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
  )
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
