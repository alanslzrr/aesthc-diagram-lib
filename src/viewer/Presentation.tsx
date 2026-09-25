import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface PresentationProps {
  children: ReactNode
  trigger: (activate: () => void) => ReactNode
  onExit: () => void
  label: string
}
/**
 * Presentation surface: requests Fullscreen API and falls back to a CSS
 * overlay when the browser rejects it. Escape exits and the caller restores
 * focus to the trigger. The document itself never changes.
 */
export function Presentation({ children, trigger, onExit, label }: PresentationProps) {
  const [mode, setMode] = useState<'off' | 'fullscreen' | 'fallback'>('off')
  const shell = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  function enter() {
    const element = shell.current
    if (!element) return
    if (document.fullscreenEnabled) {
      element.requestFullscreen().then(
        () => {
          setMode('fullscreen')
          setActive(true)
        },
        () => {
          setMode('fallback')
          setActive(true)
        },
      )
    } else {
      setMode('fallback')
      setActive(true)
    }
  }
  function exit() {
    if (mode === 'fullscreen' && document.fullscreenElement) void document.exitFullscreen()
    setActive(false)
    onExit()
  }
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit()
    }
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setActive(false)
        onExit()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [active, mode])
  return (
    <div
      ref={shell}
      className={
        active
          ? 'adl-viewer-presentation adl-viewer-presentation-active'
          : 'adl-viewer-presentation'
      }
    >
      {active && (
        <button
          type="button"
          className="adl-viewer-presentation-exit"
          onClick={exit}
          aria-label={label}
        >
          ✕ {label}
        </button>
      )}
      {children}
      {trigger(enter)}
    </div>
  )
}
