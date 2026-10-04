export type EditorPanelTab = 'outline' | 'json' | 'connections'

/**
 * The Connections panel only exists for diagram types that can author edges.
 * Keep the derivation in one place so an unavailable local tab can never
 * render an empty panel.
 */
export function panelTabsFor(type: string): readonly EditorPanelTab[] {
  return type === 'timeline' ? ['outline', 'json'] : ['outline', 'json', 'connections']
}

/** Fall back to the first supported tab when availability changes. */
export function coercePanelTab(
  tab: EditorPanelTab,
  supported: readonly EditorPanelTab[],
): EditorPanelTab {
  return supported.includes(tab) ? tab : supported[0]
}

/** Instance-scoped ids: two complete editors can share one document. */
export function panelTabId(scope: string, tab: EditorPanelTab): string {
  return `adl-editor-tab-${scope}-${tab}`
}

export function panelTabPanelId(scope: string, tab: EditorPanelTab): string {
  return `adl-editor-tabpanel-${scope}-${tab}`
}

/** `useId()` output is sanitized for attribute and selector use. */
export function panelTabScope(reactId: string): string {
  return reactId.replace(/[^a-zA-Z0-9_-]/g, '')
}
