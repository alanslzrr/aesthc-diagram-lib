import '@aesthc/diagram-lib/editor.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { PlaygroundApp } from './PlaygroundApp'
import '../fonts.css'
import '../design-system.css'
import '../generated/palette.css'
import '../theme-tokens.css'
import '../utilities.css'
import '../components/primitives/primitives.css'
import './playground.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlaygroundApp />
  </StrictMode>,
)
