import { useId, type SVGProps } from 'react'
import { brandIcons } from './data'

export type BrandIconName =
  | 'pnpm'
  | 'yarn'
  | 'npm'
  | 'bun'
  | 'github'
  | 'google-cloud'
  | 'azure'
  | 'express'
  | 'nextjs'
  | 'model-context-protocol'
  | 'openai'
  | 'openrouter'
  | 'pdf'
  | 'postgresql'

export interface BrandIconProps extends SVGProps<SVGSVGElement> {
  name: BrandIconName
}

/** Selected local TheSVG artwork, not a remote SVG loader. Import the package CSS for theme variants. */
export function BrandIcon({ name, ...props }: BrandIconProps) {
  const id = `adl-brand-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const data = brandIcons[name]
  const scope = (body: string, suffix: string) =>
    body
      .replace(/id="([^"]+)"/g, `id="${id}-${suffix}-$1"`)
      .replace(/((?:xlink:)?href=")#([^"]+)/g, `$1#${id}-${suffix}-$2`)
      .replace(/url\(#([^)]+)\)/g, `url(#${id}-${suffix}-$1)`)
  if ('light' in data && 'dark' in data) {
    return (
      <svg
        width="24"
        height="24"
        fill="none"
        viewBox={data.light.viewBox}
        aria-hidden="true"
        focusable="false"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        {...props}
      >
        <g
          className="adl-icon-light"
          dangerouslySetInnerHTML={{ __html: scope(data.light.body, 'light') }}
        />
        <g
          className="adl-icon-dark"
          dangerouslySetInnerHTML={{ __html: scope(data.dark.body, 'dark') }}
        />
      </svg>
    )
  }
  return (
    <svg
      width="24"
      height="24"
      viewBox={data.default.viewBox}
      fill="#000000"
      aria-hidden="true"
      focusable="false"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      {...props}
      className={[
        name === 'nextjs' || name === 'express' ? 'adl-brand-monochrome' : '',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      dangerouslySetInnerHTML={{ __html: scope(data.default.body, 'default') }}
    />
  )
}
