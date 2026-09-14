import { useState } from 'react'
import { PACKAGE_VERSION } from '../generated/quick-start'
import { CopyButton, ControlButton } from './ui'
import type { Locale } from '../content'
import { STRINGS } from '../content'

type Manager = 'npm' | 'pnpm' | 'yarn' | 'bun'
const managers: Manager[] = ['npm', 'pnpm', 'yarn', 'bun']
export function InstallCommand({ locale }: { locale: Locale }) {
  const [manager, setManager] = useState<Manager>(() => {
    try {
      const stored = localStorage.getItem('adl-package-manager')
      return managers.includes(stored as Manager) ? (stored as Manager) : 'npm'
    } catch {
      return 'npm'
    }
  })
  const commands: Record<Manager, string> = {
    npm: `npm install @aesthc/diagram-lib@${PACKAGE_VERSION}`,
    pnpm: `pnpm add @aesthc/diagram-lib@${PACKAGE_VERSION}`,
    yarn: `yarn add @aesthc/diagram-lib@${PACKAGE_VERSION}`,
    bun: `bun add @aesthc/diagram-lib@${PACKAGE_VERSION}`,
  }
  return (
    <section
      aria-label={locale === 'es' ? 'Instalar paquete' : 'Install package'}
      className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-3 py-2">
        <div role="group" aria-label="Package manager" className="inline-flex gap-1">
          {managers.map((candidate) => (
            <ControlButton
              key={candidate}
              active={candidate === manager}
              onClick={() => {
                setManager(candidate)
                try {
                  localStorage.setItem('adl-package-manager', candidate)
                } catch {
                  /* Storage is optional. */
                }
              }}
            >
              {candidate}
            </ControlButton>
          ))}
        </div>
        <CopyButton
          label={STRINGS.copy[locale]}
          copiedLabel={STRINGS.copied[locale]}
          getText={() => commands[manager]}
        />
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label="Installation command"
        className="overflow-x-auto px-5 py-4 font-mono text-xs leading-7 text-foreground"
      >
        <code>{commands[manager]}</code>
      </pre>
    </section>
  )
}
