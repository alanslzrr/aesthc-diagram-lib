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

import { Expressjs } from '../svgs/expressjs'
import { ExpressjsDark } from '../svgs/expressjsDark'
import { GoogleCloud } from '../svgs/googleCloud'
import { ModelContextProtocolDark } from '../svgs/modelContextProtocolDark'
import { ModelContextProtocolLight } from '../svgs/modelContextProtocolLight'
import { NextjsIconDark } from '../svgs/nextjsIconDark'
import { Openai } from '../svgs/openai'
import { OpenaiDark } from '../svgs/openaiDark'
import { OpenrouterDark } from '../svgs/openrouterDark'
import { OpenrouterLight } from '../svgs/openrouterLight'
import { Pdf } from '../svgs/pdf'
import { Postgresql } from '../svgs/postgresql'
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

  switch (visual.key) {
    case 'express':
      return (
        <>
          <Expressjs {...position} className="adl-icon-light" />
          <ExpressjsDark {...position} className="adl-icon-dark" />
        </>
      )
    case 'google-cloud':
      return <GoogleCloud {...position} />
    case 'mcp':
      return (
        <>
          <ModelContextProtocolLight {...position} className="adl-icon-light" />
          <ModelContextProtocolDark {...position} className="adl-icon-dark" />
        </>
      )
    case 'nextjs':
      return <NextjsIconDark {...position} className="dark:invert" />
    case 'openai':
      return (
        <>
          <Openai {...position} className="adl-icon-light" />
          <OpenaiDark {...position} className="adl-icon-dark" />
        </>
      )
    case 'openrouter':
      return (
        <>
          <OpenrouterLight {...position} className="adl-icon-light" />
          <OpenrouterDark {...position} className="adl-icon-dark" />
        </>
      )
    case 'pdf':
      return <Pdf {...position} />
    case 'postgresql':
      return <Postgresql {...position} />
  }
}
