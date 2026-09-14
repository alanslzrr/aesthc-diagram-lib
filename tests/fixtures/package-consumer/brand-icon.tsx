import { BrandIcon, type BrandIconName, type BrandIconProps } from '@aesthc/diagram-lib/icons'
import {
  ARCHITECTURE_EXAMPLES,
  CLOUD_ARCHITECTURE_SPEC,
  CLOUD_ARCHITECTURE_VISUALS,
  type ArchitectureExample,
} from '@aesthc/diagram-lib/examples'
const name: BrandIconName = 'pnpm'
const props: BrandIconProps = { name, width: 16, height: 16 }
export const icon = <BrandIcon {...props} />
export const architecture: ArchitectureExample = ARCHITECTURE_EXAMPLES.documents
export const compatibility = { spec: CLOUD_ARCHITECTURE_SPEC, visuals: CLOUD_ARCHITECTURE_VISUALS }
