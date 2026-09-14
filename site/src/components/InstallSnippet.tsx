import { useEffect, useState } from 'react'
import { BrandIcon } from '@aesthc/diagram-lib/icons'
import { ScrollArea } from './primitives/ScrollArea'
import { CopyIcon } from './primitives/icons'

type Manager = 'pnpm' | 'yarn' | 'npm' | 'bun'
const managers: Manager[] = ['pnpm', 'yarn', 'npm', 'bun']

export function InstallSnippet({
  packages,
  label = 'Install package',
  copyLabel = 'Copy installation command',
  className = '',
}: {
  packages: string
  label?: string
  copyLabel?: string
  className?: string
}) {
  const [manager, setManager] = useState<Manager>('npm')
  const [status, setStatus] = useState('')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('adl-package-manager')
      if (managers.includes(saved as Manager)) setManager(saved as Manager)
    } catch {
      /* Storage is optional. */
    }
  }, [])
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 1800)
    return () => clearTimeout(timer)
  }, [status])
  const code = `${manager} ${manager === 'npm' ? 'install' : 'add'} ${packages}`
  return (
    <section
      className={`install-snippet not-typeset ${className}`}
      aria-label={label}
      data-package-command=""
    >
      <div className="install-toolbar">
        <div className="install-managers" role="group" aria-label="Package manager">
          {managers.map((name) => (
            <button
              type="button"
              key={name}
              data-manager={name}
              aria-pressed={manager === name}
              className="install-manager"
              onClick={() => {
                setManager(name)
                try {
                  localStorage.setItem('adl-package-manager', name)
                } catch {
                  /* Optional preference. */
                }
              }}
            >
              <BrandIcon name={name} width="16" height="16" className="package-icon" />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="install-copy"
          data-copy-code=""
          aria-label={copyLabel}
          title={status || copyLabel}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setStatus('Copied')
            } catch {
              setStatus('Copy failed. Select the command and copy it manually.')
            }
          }}
        >
          {status === 'Copied' ? (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          ) : (
            <CopyIcon />
          )}
          <span className="sr-only" role="status">
            {status}
          </span>
        </button>
      </div>
      <ScrollArea orientation="horizontal" label="Installation command">
        <pre className="install-command">
          <span className="install-prompt" aria-hidden="true">
            $
          </span>
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </section>
  )
}
