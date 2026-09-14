import type { SVGProps } from 'react'
import {
  ArrowsSplit,
  BracketsCurly,
  FolderLock,
  Gauge,
  Graph,
  Handshake,
  ListChecks,
  ListMagnifyingGlass,
  Monitor,
  Receipt,
  RocketLaunch,
  Scales,
  SealCheck,
  UserCheck,
  UserFocus,
  Warning,
  type Icon,
} from '@phosphor-icons/react'

import { BrandIcon } from '../brand-icons'
import type { DiagramNodeVisual, SemanticNodeIconKey } from '../types'

interface ArchitectureNodeIconProps {
  size: number
  visual: DiagramNodeVisual
  x: number
  y: number
}

const SEMANTIC_ICONS: Record<SemanticNodeIconKey, Icon> = {
  'arrows-split': ArrowsSplit,
  'brackets-curly': BracketsCurly,
  'folder-lock': FolderLock,
  gauge: Gauge,
  graph: Graph,
  handshake: Handshake,
  'list-checks': ListChecks,
  'list-magnifying-glass': ListMagnifyingGlass,
  monitor: Monitor,
  receipt: Receipt,
  'rocket-launch': RocketLaunch,
  scales: Scales,
  'seal-check': SealCheck,
  'user-check': UserCheck,
  'user-focus': UserFocus,
  warning: Warning,
}

const positionedProps = (x: number, y: number, size: number): SVGProps<SVGSVGElement> => ({
  'aria-hidden': true,
  focusable: false,
  height: size,
  width: size,
  x,
  y,
})

export function ArchitectureNodeIcon({ size, visual, x, y }: ArchitectureNodeIconProps) {
  const position = positionedProps(x, y, size)

  if (visual.source === 'phosphor') {
    const SemanticIcon = SEMANTIC_ICONS[visual.key]
    return (
      <SemanticIcon
        {...position}
        className="text-foreground/75"
        color="currentColor"
        weight="regular"
      />
    )
  }

  return (
    <BrandIcon {...position} name={visual.key === 'mcp' ? 'model-context-protocol' : visual.key} />
  )
}
