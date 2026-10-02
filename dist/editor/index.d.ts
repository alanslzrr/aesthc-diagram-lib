import { E as EditorStore, L as Locale, R as ResolveRendererRegistry, a as EditorSnapshot, S as StoreOptions } from '../layout-B9EEWMV7.js';
import * as react from 'react';
import { ReactNode } from 'react';
import '../theme.js';

declare function EditorRoot({ store, locale, theme, registry, children, }: {
    store: EditorStore;
    locale: Locale;
    /** Effective view theme. Omit to follow the document's own presentation. */
    theme?: 'light' | 'dark';
    /** Trusted per-instance renderer registry. */
    registry?: ResolveRendererRegistry;
    children: ReactNode;
}): react.JSX.Element;
declare function useEditor(): {
    store: EditorStore;
    locale: Locale;
    /**
     * View-only appearance override. Rendering follows this mode while the
     * document keeps its own presentation in JSON; the inspector hides the
     * document theme control because the host owns the effective appearance.
     */
    theme?: "light" | "dark";
    /**
     * Trusted, per-instance custom node renderers. Never loaded from document
     * data; two editors can register the same typeKey differently.
     */
    registry?: ResolveRendererRegistry;
};
declare function useEditorSnapshot(): EditorSnapshot;
/** Shallow equality for composite selector slices (selection/document pairs). */
declare const shallowEqual: <T>(a: T, b: T) => boolean;
declare function useEditorSelector<T>(select: (snapshot: ReturnType<EditorStore['getSnapshot']>) => T, equals?: (a: T, b: T) => boolean): T;
declare function EditorStatus(): react.JSX.Element;
declare function EditorToolbar(): react.JSX.Element;
declare function EditorSurface({ ariaLabel, className, autoFit, }: {
    ariaLabel?: string;
    className?: string;
    /** Fit the camera on first measure. Restored sessions pass false to keep their camera. */
    autoFit?: boolean;
}): react.JSX.Element;
declare function EditorInspector(): react.JSX.Element;
declare function EditorJsonPanel(): react.JSX.Element;
/** Tabbed document panels: no collapsible summaries, explicit navigation. */
declare function EditorPanelTabs({ className }: {
    className?: string;
}): react.JSX.Element;
declare function EditorSelectionTools(): react.JSX.Element;
declare function EditorStructuredInspector(): react.JSX.Element | null;
declare function EditorNodeGeometry({ nodeId }: {
    nodeId: string;
}): react.JSX.Element | null;
declare function EditorRelations(): react.JSX.Element | null;
declare function EditorRoute(): react.JSX.Element | null;
/** Own one store per mount; options are initial values, not controlled props. */
declare function useEditorStore(options: StoreOptions): EditorStore;
/** Keyboard-accessible authored entities; synthetic layout geometry is not listed. */
declare function EditorOutline({ className }: {
    className?: string;
}): react.JSX.Element;

export { EditorInspector, EditorJsonPanel, EditorNodeGeometry, EditorOutline, EditorPanelTabs, EditorRelations, EditorRoot, EditorRoute, EditorSelectionTools, EditorStatus, EditorStructuredInspector, EditorSurface, EditorToolbar, shallowEqual, useEditor, useEditorSelector, useEditorSnapshot, useEditorStore };
