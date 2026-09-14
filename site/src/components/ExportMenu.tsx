import type { Locale } from '../content'
import { MESSAGES } from '../lib/messages'
import { useEffect, useRef, useState } from 'react'
import { ExportIcon } from './primitives/icons'

/** Native disclosure: no portal/dependency, ordinary buttons retain keyboard semantics. */
export function ExportMenu({
  locale = 'en',
  label,
  actions,
}: {
  locale?: Locale
  label: string
  actions: { label: string; run: () => void | Promise<void>; disabled?: boolean }[]
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node) && ref.current) ref.current.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return (
    <span className="export-control">
      <details
        ref={ref}
        className="export-menu"
        onBlur={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
            event.currentTarget.open = false
        }}
        onKeyDown={(event) => {
          const root = ref.current!
          if (event.key === 'Escape' && root.open) {
            event.preventDefault()
            event.stopPropagation()
            root.open = false
            root.querySelector('summary')?.focus()
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          root.open = true
          const buttons = Array.from(
            root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
          )
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
          buttons[next]?.focus()
        }}
      >
        <summary className="icon-control export-trigger" aria-label={label} title={label}>
          <ExportIcon />
        </summary>
        <div className="export-options" role="group" aria-label={label}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                ref.current!.open = false
                ref.current!.querySelector('summary')?.focus()
                setStatus('')
                setError('')
                Promise.resolve()
                  .then(action.run)
                  .then(() => setStatus(`${MESSAGES.actionDone[locale]}: ${action.label}`))
                  .catch(() => setError(MESSAGES.actionFailed[locale]))
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </details>
      {error ? <span role="alert">{error}</span> : null}
      <span className="action-status" role="status">
        {status}
      </span>
    </span>
  )
}
