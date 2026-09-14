import { BrandIcon } from '@aesthc/diagram-lib/icons'
import type { SVGProps } from 'react'

export function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return <BrandIcon width="20" height="20" {...props} name="github" />
}

export function TerminalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 7 5 5-5 5m8 0h6" />
    </svg>
  )
}
export function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

function ActionGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
export function PreviewIcon() {
  return (
    <ActionGlyph>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </ActionGlyph>
  )
}
export function CodeIcon() {
  return (
    <ActionGlyph>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
    </ActionGlyph>
  )
}
export function ShareIcon() {
  return (
    <ActionGlyph>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" />
    </ActionGlyph>
  )
}
export function ExportIcon() {
  return (
    <ActionGlyph>
      <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
    </ActionGlyph>
  )
}
