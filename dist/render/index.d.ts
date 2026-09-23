import { c as DiagramDocument, k as ResolvedScene } from '../layout-C6Gt2y8T.js';
import '../theme.js';

/** Only this encoder writes authored strings into SVG/XML. */
declare const escapeXml: (text: string) => string;
interface RenderOptions {
    theme?: 'light' | 'dark';
    background?: 'theme' | 'transparent';
    instanceId: string;
    fontCss?: string;
}
declare function renderSceneMarkup(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;
declare function renderSvg(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;

export { type RenderOptions, escapeXml, renderSceneMarkup, renderSvg };
