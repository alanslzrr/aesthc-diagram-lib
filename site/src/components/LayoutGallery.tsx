// Compact landing gallery: one thumbnail card per layout. The full
// spec/code panel and the interactive editor live in ?only= and the
// playground; the gallery keeps the first screen readable.

import { useMemo } from 'react'

import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { galleryLayout } from '../lib/gallery-layout'

import { STRINGS, SECTIONS, type Locale, type SectionEntry } from '../content'
import { GALLERY_FIXTURES, GALLERY_VIEWS } from '../lib/gallery'

const BASE = import.meta.env.BASE_URL

function GalleryCard({ entry, locale }: { entry: SectionEntry; locale: Locale }) {
  const spec = GALLERY_FIXTURES[entry.key][locale]
  const layout = useMemo(() => galleryLayout(spec), [spec])
  // Precomputed useful bounds crop authored empty margins (see lib/gallery).
  const view = GALLERY_VIEWS[entry.key][locale] ?? {
    x: 0,
    y: 0,
    width: layout.width,
    height: layout.height,
  }
  const caption = 'caption' in spec ? spec.caption : entry.title[locale]
  const representative: Record<string, Record<Locale, string>> = {
    sequence: {
      en: 'Client and API exchange a GET request and a 200 response along two lifelines.',
      es: 'Cliente y API intercambian una petición GET y una respuesta 200 sobre dos líneas de vida.',
    },
    er: {
      en: 'Users and orders show primary keys, a foreign key and a one-to-many relationship.',
      es: 'Usuarios y pedidos muestran claves primarias, una clave foránea y una relación uno a muchos.',
    },
    swimlane: {
      en: 'Support hands a triaged issue to Engineering across two labeled lanes.',
      es: 'Soporte entrega una incidencia clasificada a Ingeniería entre dos carriles etiquetados.',
    },
  }
  return (
    <li id={entry.key} data-diagram-panel={entry.key} className="layout-gallery-card">
      <div className="layout-gallery-stage diagram-backdrop" inert>
        <DiagramCanvas
          layout={layout}
          highlight={null}
          activeNodeId={null}
          focusedNodeId={null}
          selectedNodeId={null}
          onTooltipNodeChange={() => {}}
          onFocusNode={() => {}}
          onSelectNode={() => {}}
          onDismissNode={() => {}}
          instanceId={`gallery-${entry.key}`}
          ariaLabel={`${entry.type}: ${caption}`}
          nodeVisuals={{}}
          showGrid={false}
          fit="contain"
          view={view}
        />
      </div>
      <div className="layout-gallery-body">
        <div className="layout-gallery-head">
          <h3>{entry.title[locale]}</h3>
          <span>{entry.type}</span>
        </div>
        <p>{representative[entry.type]?.[locale] ?? entry.description[locale]}</p>
        <div className="layout-gallery-actions">
          <a href={`${BASE}playground.html?only=${entry.key}`}>
            {STRINGS.openPlayground[locale]} ↗
          </a>
          <a href={`?only=${entry.key}#main`}>
            {locale === 'es' ? 'Spec y código' : 'Spec & code'}
          </a>
        </div>
      </div>
    </li>
  )
}

export function LayoutGallery({ locale }: { locale: Locale }) {
  return (
    <section
      className="border-t border-border-subtle py-12"
      aria-label={locale === 'es' ? 'Galería de layouts' : 'Layout gallery'}
      id="layouts"
    >
      <h2 className="section-title text-foreground">{STRINGS.layoutsTitle[locale]}</h2>
      <p className="section-copy mt-3 max-w-[64ch] text-muted-foreground">
        {STRINGS.layoutsIntro[locale]}
      </p>
      <ul className="layout-gallery">
        {SECTIONS.map((entry) => (
          <GalleryCard key={entry.key} entry={entry} locale={locale} />
        ))}
      </ul>
    </section>
  )
}
