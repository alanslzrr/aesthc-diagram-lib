import { g as DiagramDocument, h as ResolvedScene } from '../layout-B9EEWMV7.js';
import '../theme.js';

/** Only this encoder writes authored strings into SVG/XML. */
declare const escapeXml: (text: string) => string;
interface RenderOptions {
    theme?: 'light' | 'dark';
    background?: 'theme' | 'transparent';
    instanceId: string;
    fontCss?: string;
    /**
     * Scene grid policy. `scene` (default) paints the document grid over its
     * world bounds and is what exports and the static viewer use. `none` omits
     * it so an editable surface can paint a viewport-continuous grid instead.
     */
    grid?: 'scene' | 'none';
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
    /**
     * Mark exact entity ids for semantic highlighting (viewer routes, reach,
     * cards). Parallel edges keep their own IDs and are marked individually.
     * Rendering stays headless; styling is applied by CSS or an inline style.
     */
    highlight?: {
        nodes?: ReadonlySet<string>;
        edges?: ReadonlySet<string>;
    };
    /** Reading-only dimming (lens): these entities stay in the topology but are
     * rendered with `data-lens-dim` for display filtering. */
    dim?: ReadonlySet<string>;
}
declare function renderSceneMarkup(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;
declare function renderSvg(document: DiagramDocument, scene: ResolvedScene, options: RenderOptions): string;

export { type RenderOptions, escapeXml, renderSceneMarkup, renderSvg };
