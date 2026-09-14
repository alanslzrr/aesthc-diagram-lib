import * as react from 'react';
import { SVGProps } from 'react';

type BrandIconName = 'pnpm' | 'yarn' | 'npm' | 'bun' | 'github' | 'google-cloud' | 'azure' | 'express' | 'nextjs' | 'model-context-protocol' | 'openai' | 'openrouter' | 'pdf' | 'postgresql';
interface BrandIconProps extends SVGProps<SVGSVGElement> {
    name: BrandIconName;
}
/** Selected local TheSVG artwork, not a remote SVG loader. Import the package CSS for theme variants. */
declare function BrandIcon({ name, ...props }: BrandIconProps): react.JSX.Element;

export { BrandIcon, type BrandIconName, type BrandIconProps };
