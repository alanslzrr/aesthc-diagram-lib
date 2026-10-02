import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import { createEditorStore } from '../src/editor-core/store'
import { EditorPanelTabs, EditorRoot } from '../src/editor/index'
import {
  coercePanelTab,
  panelTabId,
  panelTabPanelId,
  panelTabScope,
  panelTabsFor,
} from '../src/editor/panel-tabs'

function storeFor(spec: Parameters<typeof createDocument>[0], id: string) {
  const made = createDocument(spec, { id, locale: 'en' })
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  return createEditorStore({
    document: made.value,
    permissions: { edit: true, save: true, export: true },
  })
}

const graph = storeFor(
  {
    type: 'graph',
    caption: 'Panel tabs',
    legend: { main: 'Main', branch: 'Branch' },
    nodes: [
      { id: 'a', label: 'Alpha', description: '' },
      { id: 'b', label: 'Beta', description: '' },
    ],
    edges: [{ id: 'ab', from: 'a', to: 'b' }],
  },
  'tabs-graph',
)

const timeline = storeFor(
  {
    type: 'timeline',
    caption: 'Panel tabs',
    legend: { main: 'Main', branch: 'Branch' },
    events: [{ id: 'a', label: 'Design', description: '' }],
  },
  'tabs-timeline',
)

function render(...stores: Array<ReturnType<typeof storeFor>>) {
  return renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      ...stores.map((store, index) =>
        createElement(EditorRoot, {
          key: index,
          store,
          locale: 'en' as const,
          children: createElement(EditorPanelTabs),
        }),
      ),
    ),
  )
}

describe('editor panel tab availability', () => {
  it('only offers Connections where edges can be authored', () => {
    expect(panelTabsFor('graph')).toEqual(['outline', 'json', 'connections'])
    expect(panelTabsFor('timeline')).toEqual(['outline', 'json'])
    expect(panelTabsFor('swimlane')).toContain('connections')
  })

  it('coerces an unsupported local tab back to the first supported tab', () => {
    expect(coercePanelTab('connections', panelTabsFor('timeline'))).toBe('outline')
    expect(coercePanelTab('connections', panelTabsFor('graph'))).toBe('connections')
    expect(coercePanelTab('json', panelTabsFor('timeline'))).toBe('json')
  })

  it('scopes ids per editor and keeps tab and panel ids distinct', () => {
    const first = panelTabScope(':r0:')
    const second = panelTabScope(':r1:')
    expect(first).not.toBe(second)
    for (const tab of panelTabsFor('graph')) {
      expect(panelTabId(first, tab)).toMatch(/^adl-editor-tab-[a-zA-Z0-9_-]+-/)
      expect(panelTabId(first, tab)).not.toBe(panelTabId(second, tab))
      expect(panelTabId(first, tab)).not.toBe(panelTabPanelId(first, tab))
      expect(panelTabPanelId(first, tab)).not.toBe(panelTabPanelId(second, tab))
    }
  })

  it('renders graph with a connections tab and timeline without one at all', () => {
    const graphMarkup = render(graph)
    expect((graphMarkup.match(/role="tab"/g) ?? []).length).toBe(3)
    expect(graphMarkup).toContain('-connections"')
    const timelineMarkup = render(timeline)
    expect((timelineMarkup.match(/role="tab"/g) ?? []).length).toBe(2)
    expect(timelineMarkup).not.toContain('-connections"')
  })

  it('renders two complete editors at once with unique ids', () => {
    // Server rendering instantiates both components and both stores together;
    // it is the closest two-instance harness available without a DOM runtime.
    const markup = render(graph, timeline)
    const ids = [...markup.matchAll(/id="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    const tabIds = ids.filter((id) => id.startsWith('adl-editor-tab-'))
    expect(tabIds.length).toBeGreaterThan(0)
    expect(new Set(tabIds).size).toBe(tabIds.length)
  })
})
