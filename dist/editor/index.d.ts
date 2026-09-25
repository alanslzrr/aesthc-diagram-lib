import { E as EditorStore, L as Locale, a as EditorSnapshot, S as StoreOptions } from '../layout-C01UhqPQ.js';
import * as react from 'react';
import { ReactNode } from 'react';
import '../theme.js';

declare function EditorRoot({ store, locale, children, }: {
    store: EditorStore;
    locale: Locale;
    children: ReactNode;
}): react.JSX.Element;
declare function useEditor(): {
    store: EditorStore;
    locale: Locale;
};
declare function useEditorSnapshot(): EditorSnapshot;
/** Shallow equality for composite selector slices (selection/document pairs). */
declare const shallowEqual: <T>(a: T, b: T) => boolean;
declare function useEditorSelector<T>(select: (snapshot: ReturnType<EditorStore['getSnapshot']>) => T, equals?: (a: T, b: T) => boolean): T;
declare function EditorStatus(): react.JSX.Element;
declare function EditorToolbar(): react.JSX.Element;
declare function EditorSurface({ ariaLabel, className, }: {
    ariaLabel?: string;
    className?: string;
}): react.JSX.Element;
declare function EditorInspector(): react.JSX.Element;
declare function EditorJsonPanel(): react.JSX.Element;
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

export { EditorInspector, EditorJsonPanel, EditorNodeGeometry, EditorOutline, EditorRelations, EditorRoot, EditorRoute, EditorSelectionTools, EditorStatus, EditorStructuredInspector, EditorSurface, EditorToolbar, shallowEqual, useEditor, useEditorSelector, useEditorSnapshot, useEditorStore };
