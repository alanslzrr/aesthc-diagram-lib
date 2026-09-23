import { brandIcons } from '../brand-icons/data'
import { semanticIcons } from '../brand-icons/semantic-data'
import { scopeIconMarkup } from '../brand-icons/scope'
import type { DiagramNodeVisual } from '../types'

export function renderNodeIcon(
  visual: DiagramNodeVisual,
  prefix: string,
  x: number,
  y: number,
  size: number,
  theme: 'light' | 'dark',
  foreground: string,
): string {
  const key = visual.key === 'mcp' ? 'model-context-protocol' : visual.key
  const asset =
    visual.source === 'phosphor'
      ? semanticIcons[visual.key]
      : brandIcons[key as keyof typeof brandIcons]
  const data =
    'body' in asset ? asset : 'light' in asset && 'dark' in asset ? asset[theme] : asset.default
  const monochrome = visual.source !== 'phosphor' && (key === 'nextjs' || key === 'express')
  return `<svg data-node-icon="${visual.key}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${data.viewBox}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" color="${foreground}" fill="${visual.source === 'phosphor' ? 'currentColor' : '#000000'}"${monochrome && theme === 'dark' ? ' style="filter:invert(1)"' : ''}>${scopeIconMarkup(data.body, prefix)}</svg>`
}
