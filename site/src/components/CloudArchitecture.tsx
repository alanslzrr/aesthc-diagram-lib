import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useId, useMemo, useState } from 'react'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { buildAdjacency, connectedIds, diagramEdges } from '@aesthc/diagram-lib'
import { ARCHITECTURE_EXAMPLES } from '@aesthc/diagram-lib/examples'
import { ScrollArea } from './primitives/ScrollArea'
import type { Locale } from '../content'

export function CloudArchitecture({ locale }: { locale: Locale }) {
  const instanceId = useId()
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [choice, setChoice] = useState<keyof typeof ARCHITECTURE_EXAMPLES>('documents')
  const example = ARCHITECTURE_EXAMPLES[choice]
  const spec = example.diagram[locale]
  const layout = useMemo(() => layoutDiagram(spec), [spec])
  const adjacency = useMemo(() => buildAdjacency(diagramEdges(spec)), [spec])
  const active = hovered ?? focused ?? selected
  return (
    <section
      className="border-t border-foreground/20 py-12"
      aria-label="Cloud architecture example"
      id="cloud-architecture"
    >
      <h2 className="section-title">
        {locale === 'es' ? 'Arquitectura en práctica' : 'Architecture in practice'}
      </h2>
      <p className="section-copy mt-3 max-w-[64ch] text-foreground/74">
        {locale === 'es'
          ? 'Tres flujos de referencia: datos, pedidos y releases. Servicios concretos, responsabilidades y caminos de fallo.'
          : 'Three reference flows: data, orders and releases. Concrete services, responsibilities and failure paths.'}
      </p>
      <ToggleGroup.Root
        type="single"
        value={choice}
        className="architecture-tabs mt-6"
        aria-label={locale === 'es' ? 'Elegir arquitectura' : 'Choose architecture'}
        onValueChange={(value) => {
          if (!value) return
          setChoice(value as keyof typeof ARCHITECTURE_EXAMPLES)
          setHovered(null)
          setFocused(null)
          setSelected(null)
        }}
      >
        {Object.entries(ARCHITECTURE_EXAMPLES).map(([key, item]) => (
          <ToggleGroup.Item key={key} value={key}>
            {item.title[locale]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <p className="section-copy mt-4 max-w-[72ch] text-muted-foreground">
        {example.summary[locale]}
      </p>
      <ScrollArea
        orientation="horizontal"
        label="Cloud architecture diagram"
        className="mt-6 rounded-lg border border-border bg-card/30"
      >
        <div className="min-w-[960px] p-6">
          <DiagramCanvas
            layout={layout}
            highlight={active ? connectedIds(active, adjacency) : null}
            activeNodeId={active}
            focusedNodeId={focused}
            selectedNodeId={selected}
            instanceId={`${instanceId}-${choice}`}
            ariaLabel={spec.caption}
            nodeVisuals={example.visuals}
            onTooltipNodeChange={(id, open) => setHovered(open ? id : null)}
            onFocusNode={setFocused}
            onSelectNode={(id) => setSelected(selected === id ? null : id)}
            onDismissNode={() => {
              setHovered(null)
              setSelected(null)
            }}
          />
        </div>
      </ScrollArea>
      <ul className="architecture-notes mt-4">
        {example.notes[locale].map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <div
        className="architecture-sources mt-3"
        aria-label={locale === 'es' ? 'Referencias técnicas' : 'Technical references'}
      >
        {example.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            {source.label} ↗
          </a>
        ))}
      </div>
    </section>
  )
}
