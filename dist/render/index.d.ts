import { c as DiagramDocument, k as ResolvedScene } from '../layout-BFDKbm6N.js';
import '../theme.js';

/** Only this encoder writes authored strings into SVG/XML. */
declare const escapeXml: (text: string) => string;
interface RenderOptions {
    theme?: 'light' | 'dark';
    background?: 'theme' | 'transparent';
    instanceId: string;
    fontCss?: string;
    /**
     * Render only these entity ids (gesture delta pass). Static chrome (defs,
     * grid, containers, lifelines, decisions, notices) is skipped so the string
     * stays small; the caller keeps it inside the same SVG as the baseline.
     */
    only?: {
        nodes?: ReadonlySet<string>;
        edges?: ReadonlySet<string>;
    };
    /**
     * Render everything except these entity ids (gesture baseline pass). Used to
     * keep the baseline free of the entities the delta pass redraws.
     */
    exclude?: {
        nodes?: ReadonlySet<string>;
        edges?: ReadonlySet<string>;
    };
}
declare function renderSceneMarkup(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;
declare function renderSvg(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;

export { type RenderOptions, escapeXml, renderSceneMarkup, renderSvg };
