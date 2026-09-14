import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { animate } from 'motion/mini'

const Context = createContext<{ expanded: boolean; enhanced: boolean; closing: boolean }>({
  expanded: false,
  enhanced: false,
  closing: false,
})
// Native details/summary before hydration, with Motion's measured height
// transition after hydration. Keep details open while its closing animation runs.
export function Disclosure({
  children,
  defaultOpen = false,
  className = '',
  ...props
}: Omit<ComponentProps<'details'>, 'open'> & { defaultOpen?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [expanded, setExpanded] = useState(defaultOpen)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    setEnhanced(true)
    setExpanded(ref.current?.open ?? defaultOpen)
  }, [defaultOpen])
  useEffect(() => {
    const root = ref.current
    if (!root || !enhanced) return
    let controls: ReturnType<typeof animate> | undefined
    let generation = 0
    const content = root.querySelector<HTMLElement>('[data-disclosure-content]')!
    const trigger = root.querySelector('summary')!
    function toggle(event: Event) {
      event.preventDefault()
      const next = !root!.hasAttribute('data-expanded')
      const run = ++generation
      controls?.stop()
      if (!next && content.contains(document.activeElement)) trigger.focus()
      const start = content.getBoundingClientRect().height
      root!.open = true
      root!.toggleAttribute('data-expanded', next)
      setExpanded(next)
      setClosing(!next)
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      content.style.height = 'auto'
      const height = content.scrollHeight
      controls = animate(
        content,
        { height: [next ? start : height, next ? height : 0], opacity: next ? [0, 1] : [1, 0] },
        { duration: reduced ? 0 : 0.18, ease: 'easeOut' },
      )
      controls
        .then(() => {
          if (run !== generation) return
          if (!next) root!.open = false
          content.style.height = ''
          content.style.opacity = ''
          setClosing(false)
        })
        .catch(() => {})
    }
    trigger.addEventListener('click', toggle)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && root!.hasAttribute('data-expanded')) {
        event.preventDefault()
        trigger.click()
        trigger.focus()
      }
    }
    root.addEventListener('keydown', escape)
    return () => {
      generation++
      controls?.stop()
      trigger.removeEventListener('click', toggle)
      root.removeEventListener('keydown', escape)
    }
  }, [enhanced])
  return (
    <Context.Provider value={{ expanded, enhanced, closing }}>
      <details
        {...props}
        ref={ref}
        className={`disclosure ${className}`}
        open={expanded || closing}
        data-expanded={expanded ? '' : undefined}
      >
        {children}
      </details>
    </Context.Provider>
  )
}
export function DisclosureTrigger({ children, ...props }: ComponentProps<'summary'>) {
  const { expanded, enhanced } = useContext(Context)
  return (
    <summary {...props} aria-expanded={enhanced ? expanded : undefined}>
      {children}
      <svg
        className="disclosure-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </summary>
  )
}
export function DisclosureContent({ children }: { children: ReactNode }) {
  const { closing } = useContext(Context)
  return (
    <div data-disclosure-content inert={closing || undefined}>
      {children}
    </div>
  )
}
