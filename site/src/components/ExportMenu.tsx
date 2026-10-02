import type { Locale } from '../content'
import { MESSAGES } from '../lib/messages'
import { useEffect, useRef, useState } from 'react'
import { ExportIcon } from './primitives/icons'

/**
 * Controlled menu instead of a native disclosure: Safari can blur a summary
 * toward the enclosing main element while a menu action is being clicked, and
 * a synchronous blur dismissal removed the action's hit area before click.
 * Dismissal is pointer/focus based, actions run exactly once and focus returns
 * to the trigger.
 */
export function ExportMenu({
  locale = 'en',
  label,
  actions,
}: {
  locale?: Locale
  label: string
  actions: { label: string; run: () => void | Promise<void>; disabled?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<Array<HTMLButtonElement | null>>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function key(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  function run(action: { label: string; run: () => void | Promise<void> }) {
    setOpen(false)
    trigger.current?.focus()
    setStatus('')
    setError('')
    Promise.resolve()
      .then(action.run)
      .then(() => setStatus(`${MESSAGES.actionDone[locale]}: ${action.label}`))
      .catch(() => setError(MESSAGES.actionFailed[locale]))
  }
  return (
    <span className="export-control export-menu" ref={ref}>
      <button
        ref={trigger}
        type="button"
        className="icon-control export-trigger"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          setOpen(true)
          queueMicrotask(() => {
            const buttons = items.current.filter(Boolean) as HTMLButtonElement[]
            const index = event.key === 'ArrowUp' || event.key === 'End' ? buttons.length - 1 : 0
            buttons[index]?.focus()
          })
        }}
      >
        <ExportIcon />
      </button>
      {open && (
        <div className="export-options" role="menu" aria-label={label}>
          {actions.map((action, index) => (
            <button
              key={action.label}
              ref={(node) => {
                items.current[index] = node
              }}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => run(action)}
              onKeyDown={(event) => {
                const buttons = items.current.filter(Boolean) as HTMLButtonElement[]
                const current = buttons.indexOf(event.currentTarget)
                const next =
                  event.key === 'ArrowDown'
                    ? (current + 1) % buttons.length
                    : event.key === 'ArrowUp'
                      ? (current - 1 + buttons.length) % buttons.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? buttons.length - 1
                          : undefined
                if (next === undefined) return
                event.preventDefault()
                buttons[next]?.focus()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {error ? <span role="alert">{error}</span> : null}
      <span className="action-status" role="status">
        {status}
      </span>
    </span>
  )
}
