// Example diagrams showing how to author new content with the reusable
// diagram library — one per supported type, with real topology you can adapt.
//
// None of these are registered by default (the portfolio only ships the two
// case studies in `src/lib/architecture-diagrams.ts`). To try them in the
// renderer, call `registerExampleDiagrams()` from a module that runs before
// the page renders, then use `diagramKey: 'example-flowchart'` etc.

import type { DiagramRegistration } from './types'
import { registerDiagram } from './registry'

export const EXAMPLE_DIAGRAMS: Record<string, DiagramRegistration> = {
  // ── Band ──────────────────────────────────────────────────────────────────
  'example-band': {
    diagram: {
      en: {
        type: 'band',
        caption:
          'a request pipeline: intake, validation, and a policy-gated outcome with an off-canvas retry',
        legend: { main: 'request path', branch: 'sandbox · retry' },
        bands: [{ title: 'Intake' }, { title: 'Validation' }, { title: 'Outcome' }],
        nodes: [
          {
            id: 'ingress',
            band: 0,
            label: 'Ingress',
            description: 'Authenticated API and manual uploads enter the same normalized request.',
            kind: 'Trigger',
            sublabel: 'api · upload',
            weight: 'primary',
          },
          {
            id: 'validate',
            band: 1,
            label: 'Validate',
            description:
              'Deterministic checks plus an LLM pass confirm the request is well-formed.',
            kind: 'Engine',
            sublabel: 'rules · llm',
            weight: 'primary',
          },
          {
            id: 'approve',
            band: 2,
            label: 'Approved',
            description: 'The request passes policy and is persisted with its audit trail.',
            kind: 'Outcome',
            sublabel: 'persisted',
            weight: 'primary',
          },
          {
            id: 'quarantine',
            band: 2,
            label: 'Quarantine',
            description: 'Low-confidence requests pause for operator review instead of failing.',
            kind: 'Outcome',
            sublabel: 'review',
          },
        ],
        edges: [
          { from: 'ingress', to: 'validate' },
          { from: 'validate', to: 'approve', label: 'pass', labelPlacement: 'above-target' },
          {
            from: 'validate',
            to: 'quarantine',
            label: 'uncertain',
            variant: 'branch',
            dashed: true,
            labelPlacement: 'below-target',
          },
        ],
        decisions: [{ id: 'validate-pass', source: 'validate', label: 'valid?' }],
        continuations: [
          {
            id: 'retry-ingress',
            from: 'quarantine',
            label: 'retry',
            destination: 'ingress',
            side: 'left',
            anchor: 'lower',
            labelPlacement: 'below-source',
            variant: 'branch',
            ariaLabel: 'operator retry returns the request to ingress',
          },
        ],
      },
      es: {
        type: 'band',
        caption:
          'un pipeline de solicitudes: entrada, validación y un resultado regido por políticas con reintento fuera de lienzo',
        legend: { main: 'ruta de solicitud', branch: 'prueba · reintento' },
        bands: [{ title: 'Entrada' }, { title: 'Validación' }, { title: 'Resultado' }],
        nodes: [
          {
            id: 'ingress',
            band: 0,
            label: 'Entrada',
            description:
              'La API autenticada y las subidas manuales entran como una misma solicitud normalizada.',
            kind: 'Disparador',
            sublabel: 'api · subida',
            weight: 'primary',
          },
          {
            id: 'validate',
            band: 1,
            label: 'Validar',
            description:
              'Comprobaciones deterministas más un pase de LLM confirman que la solicitud es válida.',
            kind: 'Motor',
            sublabel: 'reglas · llm',
            weight: 'primary',
          },
          {
            id: 'approve',
            band: 2,
            label: 'Aprobado',
            description:
              'La solicitud supera la política y se conserva con su registro de auditoría.',
            kind: 'Resultado',
            sublabel: 'persistido',
            weight: 'primary',
          },
          {
            id: 'quarantine',
            band: 2,
            label: 'Cuarentena',
            description:
              'Las solicitudes con poca confianza esperan revisión del operador en vez de fallar.',
            kind: 'Resultado',
            sublabel: 'revisión',
          },
        ],
        edges: [
          { from: 'ingress', to: 'validate' },
          { from: 'validate', to: 'approve', label: 'válido', labelPlacement: 'above-target' },
          {
            from: 'validate',
            to: 'quarantine',
            label: 'dudoso',
            variant: 'branch',
            dashed: true,
            labelPlacement: 'below-target',
          },
        ],
        decisions: [{ id: 'validate-pass', source: 'validate', label: '¿válido?' }],
        continuations: [
          {
            id: 'retry-ingress',
            from: 'quarantine',
            label: 'reintentar',
            destination: 'entrada',
            side: 'left',
            anchor: 'lower',
            labelPlacement: 'below-source',
            variant: 'branch',
            ariaLabel: 'el reintento del operador devuelve la solicitud a la entrada',
          },
        ],
      },
    },
    visuals: {
      ingress: { source: 'phosphor', key: 'folder-lock' },
      validate: { source: 'phosphor', key: 'gauge' },
      approve: { source: 'phosphor', key: 'seal-check' },
      quarantine: { source: 'phosphor', key: 'warning' },
    },
  },

  // ── Flowchart ─────────────────────────────────────────────────────────────
  'example-flowchart': {
    diagram: {
      en: {
        type: 'flowchart',
        direction: 'top-down',
        caption:
          'a deploy pipeline with a smoke gate: preview → tests → manual approval → canary → production',
        legend: { main: 'happy path', branch: 'rollback · failure' },
        nodes: [
          {
            id: 'start',
            label: 'Merge to main',
            description: 'Every merge to the main branch triggers the pipeline.',
            kind: 'Trigger',
            sublabel: 'git push',
            shape: 'terminal',
            weight: 'primary',
          },
          {
            id: 'build',
            label: 'Build + lint',
            description: 'Compiles the application and runs the linter with type checking.',
            kind: 'CI',
            sublabel: 'tsc · eslint',
          },
          {
            id: 'tests',
            label: 'Test suite',
            description: 'Runs unit and integration tests against an ephemeral database.',
            kind: 'CI',
            sublabel: 'vitest',
          },
          {
            id: 'smoke',
            label: 'Smoke gate',
            description: 'Deploys a preview and probes the critical paths before anything ships.',
            kind: 'Gate',
            sublabel: 'preview probes',
            weight: 'primary',
          },
          {
            id: 'approve',
            label: 'Manual approval',
            description: 'A human reviews the preview and approves the canary rollout.',
            kind: 'Review',
            sublabel: 'operator',
          },
          {
            id: 'canary',
            label: 'Canary 5%',
            description: 'Routes a small share of traffic while error budgets are watched.',
            kind: 'Deploy',
            sublabel: '10 min window',
            weight: 'primary',
          },
          {
            id: 'prod',
            label: 'Production',
            description: 'Promotes the canary to full production traffic.',
            kind: 'Deploy',
            sublabel: '100%',
            weight: 'primary',
          },
          {
            id: 'rollback',
            label: 'Rollback',
            description: 'Reverts the canary to the previous revision when the gate fails.',
            kind: 'Failure',
            sublabel: 'previous revision',
            weight: 'secondary',
          },
        ],
        edges: [
          { from: 'start', to: 'build' },
          { from: 'build', to: 'tests' },
          { from: 'tests', to: 'smoke' },
          { from: 'smoke', to: 'approve' },
          { from: 'smoke', to: 'rollback', label: 'probe failed', variant: 'branch', dashed: true },
          { from: 'approve', to: 'canary' },
          { from: 'approve', to: 'rollback', label: 'rejected', variant: 'branch', dashed: true },
          { from: 'canary', to: 'prod', label: 'healthy' },
          {
            from: 'canary',
            to: 'rollback',
            label: 'budget exceeded',
            variant: 'branch',
            dashed: true,
          },
          { from: 'rollback', to: 'start', label: 'fix forward', variant: 'branch', dashed: true },
        ],
      },
      es: {
        type: 'flowchart',
        direction: 'top-down',
        caption:
          'un pipeline de despliegue con puerta de humo: preview → pruebas → aprobación manual → canary → producción',
        legend: { main: 'camino feliz', branch: 'rollback · fallo' },
        nodes: [
          {
            id: 'start',
            label: 'Merge a main',
            description: 'Cada merge a la rama principal dispara el pipeline.',
            kind: 'Disparador',
            sublabel: 'git push',
            shape: 'terminal',
            weight: 'primary',
          },
          {
            id: 'build',
            label: 'Build + lint',
            description: 'Compila la aplicación y ejecuta el linter con verificación de tipos.',
            kind: 'CI',
            sublabel: 'tsc · eslint',
          },
          {
            id: 'tests',
            label: 'Suite de pruebas',
            description: 'Ejecuta pruebas unitarias y de integración contra una base efímera.',
            kind: 'CI',
            sublabel: 'vitest',
          },
          {
            id: 'smoke',
            label: 'Puerta de humo',
            description: 'Despliega un preview y sondea las rutas críticas antes de publicar.',
            kind: 'Control',
            sublabel: 'sondas preview',
            weight: 'primary',
          },
          {
            id: 'approve',
            label: 'Aprobación manual',
            description: 'Una persona revisa el preview y aprueba el lanzamiento canary.',
            kind: 'Revisión',
            sublabel: 'operador',
          },
          {
            id: 'canary',
            label: 'Canary 5%',
            description:
              'Enruta una pequeña parte del tráfico mientras se vigila el presupuesto de error.',
            kind: 'Despliegue',
            sublabel: 'ventana 10 min',
            weight: 'primary',
          },
          {
            id: 'prod',
            label: 'Producción',
            description: 'Promueve el canary al tráfico completo de producción.',
            kind: 'Despliegue',
            sublabel: '100%',
            weight: 'primary',
          },
          {
            id: 'rollback',
            label: 'Rollback',
            description: 'Revierte el canary a la revisión anterior si la puerta falla.',
            kind: 'Fallo',
            sublabel: 'revisión previa',
            weight: 'secondary',
          },
        ],
        edges: [
          { from: 'start', to: 'build' },
          { from: 'build', to: 'tests' },
          { from: 'tests', to: 'smoke' },
          { from: 'smoke', to: 'approve' },
          { from: 'smoke', to: 'rollback', label: 'sonda falló', variant: 'branch', dashed: true },
          { from: 'approve', to: 'canary' },
          { from: 'approve', to: 'rollback', label: 'rechazado', variant: 'branch', dashed: true },
          { from: 'canary', to: 'prod', label: 'sano' },
          { from: 'canary', to: 'rollback', label: 'presupuesto', variant: 'branch', dashed: true },
          { from: 'rollback', to: 'start', label: 'corregir', variant: 'branch', dashed: true },
        ],
      },
    },
    visuals: {
      start: { source: 'phosphor', key: 'rocket-launch' },
      build: { source: 'phosphor', key: 'list-checks' },
      tests: { source: 'phosphor', key: 'seal-check' },
      smoke: { source: 'phosphor', key: 'gauge' },
      approve: { source: 'phosphor', key: 'user-check' },
      canary: { source: 'phosphor', key: 'arrows-split' },
      prod: { source: 'phosphor', key: 'scales' },
      rollback: { source: 'phosphor', key: 'warning' },
    },
  },

  // ── Sequence ──────────────────────────────────────────────────────────────
  'example-sequence': {
    diagram: {
      en: {
        type: 'sequence',
        caption:
          'a checkout flow: the client talks to the API, the API to the payment provider, and webhooks reconcile the order',
        legend: { main: 'request · event', branch: 'failure · retry' },
        participants: [
          { id: 'client', label: 'Client', kind: 'Web' },
          { id: 'api', label: 'API', kind: 'Next.js' },
          { id: 'pay', label: 'Payments', kind: 'Stripe' },
          { id: 'db', label: 'Orders', kind: 'Postgres' },
        ],
        messages: [
          { id: 'checkout', from: 'client', to: 'api', label: 'POST /checkout', activation: true },
          { id: 'intent', from: 'api', to: 'pay', label: 'create intent', activation: true },
          { id: 'confirm', from: 'client', to: 'pay', label: 'confirm card' },
          { id: 'webhook', from: 'pay', to: 'api', label: 'payment.succeeded', variant: 'branch' },
          { id: 'persist', from: 'api', to: 'db', label: 'INSERT order', activation: true },
          { id: 'ack', from: 'db', to: 'api', label: 'committed' },
          { id: 'done', from: 'api', to: 'client', label: '201 order', activation: true },
        ],
      },
      es: {
        type: 'sequence',
        caption:
          'un flujo de checkout: el cliente habla con la API, la API con el proveedor de pagos y los webhooks concilian el pedido',
        legend: { main: 'solicitud · evento', branch: 'fallo · reintento' },
        participants: [
          { id: 'client', label: 'Cliente', kind: 'Web' },
          { id: 'api', label: 'API', kind: 'Next.js' },
          { id: 'pay', label: 'Pagos', kind: 'Stripe' },
          { id: 'db', label: 'Pedidos', kind: 'Postgres' },
        ],
        messages: [
          { id: 'checkout', from: 'client', to: 'api', label: 'POST /checkout', activation: true },
          { id: 'intent', from: 'api', to: 'pay', label: 'crear intent', activation: true },
          { id: 'confirm', from: 'client', to: 'pay', label: 'confirmar tarjeta' },
          { id: 'webhook', from: 'pay', to: 'api', label: 'payment.succeeded', variant: 'branch' },
          { id: 'persist', from: 'api', to: 'db', label: 'INSERT pedido', activation: true },
          { id: 'ack', from: 'db', to: 'api', label: 'confirmado' },
          { id: 'done', from: 'api', to: 'client', label: '201 pedido', activation: true },
        ],
      },
    },
    visuals: {
      client: { source: 'phosphor', key: 'monitor' },
      api: { source: 'svgl', key: 'nextjs' },
      pay: { source: 'phosphor', key: 'receipt' },
      db: { source: 'svgl', key: 'postgresql' },
    },
  },

  // ── State machine ─────────────────────────────────────────────────────────
  'example-state-machine': {
    diagram: {
      en: {
        type: 'state-machine',
        caption: 'an order lifecycle with a cancelled sink state and an expiry timer',
        legend: { main: 'valid transition', branch: 'timeout · cancel' },
        states: [
          {
            id: 'created',
            label: 'Created',
            kind: 'Start',
            initial: true,
            description: 'The order is persisted but not yet paid.',
          },
          {
            id: 'payment',
            label: 'Payment pending',
            kind: 'Awaiting',
            description: 'Waiting for the payment provider confirmation.',
          },
          {
            id: 'paid',
            label: 'Paid',
            kind: 'Confirmed',
            weight: 'primary',
            description: 'Payment succeeded; the order is ready to fulfil.',
          },
          {
            id: 'shipped',
            label: 'Shipped',
            kind: 'Fulfilment',
            description: 'The carrier has the parcel.',
          },
          {
            id: 'delivered',
            label: 'Delivered',
            kind: 'Done',
            weight: 'primary',
            final: true,
            description: 'The customer received the order.',
          },
          {
            id: 'cancelled',
            label: 'Cancelled',
            kind: 'Sink',
            final: true,
            description: 'Terminal state; no further transitions.',
          },
        ],
        transitions: [
          { from: 'created', to: 'payment', label: 'checkout' },
          { from: 'payment', to: 'paid', label: 'paid' },
          { from: 'payment', to: 'cancelled', label: 'expired', variant: 'branch', dashed: true },
          { from: 'paid', to: 'shipped', label: 'label' },
          { from: 'shipped', to: 'delivered', label: 'signed' },
          { from: 'created', to: 'cancelled', label: 'cancel', variant: 'branch' },
          { from: 'paid', to: 'cancelled', label: 'refund', variant: 'branch', dashed: true },
        ],
      },
      es: {
        type: 'state-machine',
        caption:
          'un ciclo de vida de pedido con estado final cancelado y temporizador de expiración',
        legend: { main: 'transición válida', branch: 'tiempo · cancelar' },
        states: [
          {
            id: 'created',
            label: 'Creado',
            kind: 'Inicio',
            initial: true,
            description: 'El pedido se conserva pero aún no se ha pagado.',
          },
          {
            id: 'payment',
            label: 'Pago pendiente',
            kind: 'Espera',
            description: 'Esperando la confirmación del proveedor de pagos.',
          },
          {
            id: 'paid',
            label: 'Pagado',
            kind: 'Confirmado',
            weight: 'primary',
            description: 'El pago se completó; el pedido está listo para despacho.',
          },
          {
            id: 'shipped',
            label: 'Enviado',
            kind: 'Despacho',
            description: 'El transportista tiene el paquete.',
          },
          {
            id: 'delivered',
            label: 'Entregado',
            kind: 'Final',
            weight: 'primary',
            final: true,
            description: 'El cliente recibió el pedido.',
          },
          {
            id: 'cancelled',
            label: 'Cancelado',
            kind: 'Sumidero',
            final: true,
            description: 'Estado terminal; sin más transiciones.',
          },
        ],
        transitions: [
          { from: 'created', to: 'payment', label: 'checkout' },
          { from: 'payment', to: 'paid', label: 'pagado' },
          { from: 'payment', to: 'cancelled', label: 'expirado', variant: 'branch', dashed: true },
          { from: 'paid', to: 'shipped', label: 'etiqueta' },
          { from: 'shipped', to: 'delivered', label: 'firmado' },
          { from: 'created', to: 'cancelled', label: 'cancelar', variant: 'branch' },
          { from: 'paid', to: 'cancelled', label: 'reembolso', variant: 'branch', dashed: true },
        ],
      },
    },
  },

  // ── ER / data model ───────────────────────────────────────────────────────
  'example-er': {
    diagram: {
      en: {
        type: 'er',
        caption: 'the catalog schema: products, categories, variants and stock lines',
        legend: { main: 'relation', branch: 'optional' },
        entities: [
          {
            id: 'products',
            label: 'products',
            kind: 'table',
            weight: 'primary',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'slug', type: 'varchar(120)', key: 'unique' },
              { name: 'name', type: 'text' },
              { name: 'price_cents', type: 'int' },
            ],
          },
          {
            id: 'categories',
            label: 'categories',
            kind: 'table',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'parent_id', type: 'uuid', key: 'fk' },
              { name: 'title', type: 'varchar(80)' },
            ],
          },
          {
            id: 'product_categories',
            label: 'product_categories',
            kind: 'table',
            fields: [
              { name: 'product_id', type: 'uuid', key: 'fk' },
              { name: 'category_id', type: 'uuid', key: 'fk' },
            ],
          },
          {
            id: 'variants',
            label: 'variants',
            kind: 'table',
            weight: 'primary',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'product_id', type: 'uuid', key: 'fk' },
              { name: 'sku', type: 'varchar(40)', key: 'unique' },
              { name: 'options', type: 'jsonb' },
            ],
          },
          {
            id: 'stock',
            label: 'stock_lines',
            kind: 'table',
            fields: [
              { name: 'variant_id', type: 'uuid', key: 'fk' },
              { name: 'warehouse', type: 'varchar(20)' },
              { name: 'qty', type: 'int' },
            ],
          },
        ],
        relations: [
          { from: 'products', to: 'product_categories', label: 'N' },
          { from: 'categories', to: 'product_categories', label: '1' },
          { from: 'products', to: 'variants', label: '1—N' },
          { from: 'variants', to: 'stock', label: '1—N', variant: 'branch' },
        ],
      },
      es: {
        type: 'er',
        caption: 'el esquema del catálogo: productos, categorías, variantes y líneas de stock',
        legend: { main: 'relación', branch: 'opcional' },
        entities: [
          {
            id: 'products',
            label: 'products',
            kind: 'tabla',
            weight: 'primary',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'slug', type: 'varchar(120)', key: 'unique' },
              { name: 'name', type: 'text' },
              { name: 'price_cents', type: 'int' },
            ],
          },
          {
            id: 'categories',
            label: 'categories',
            kind: 'tabla',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'parent_id', type: 'uuid', key: 'fk' },
              { name: 'title', type: 'varchar(80)' },
            ],
          },
          {
            id: 'product_categories',
            label: 'product_categories',
            kind: 'tabla',
            fields: [
              { name: 'product_id', type: 'uuid', key: 'fk' },
              { name: 'category_id', type: 'uuid', key: 'fk' },
            ],
          },
          {
            id: 'variants',
            label: 'variants',
            kind: 'tabla',
            weight: 'primary',
            fields: [
              { name: 'id', type: 'uuid', key: 'pk' },
              { name: 'product_id', type: 'uuid', key: 'fk' },
              { name: 'sku', type: 'varchar(40)', key: 'unique' },
              { name: 'options', type: 'jsonb' },
            ],
          },
          {
            id: 'stock',
            label: 'stock_lines',
            kind: 'tabla',
            fields: [
              { name: 'variant_id', type: 'uuid', key: 'fk' },
              { name: 'warehouse', type: 'varchar(20)' },
              { name: 'qty', type: 'int' },
            ],
          },
        ],
        relations: [
          { from: 'products', to: 'product_categories', label: 'N' },
          { from: 'categories', to: 'product_categories', label: '1' },
          { from: 'products', to: 'variants', label: '1—N' },
          { from: 'variants', to: 'stock', label: '1—N', variant: 'branch' },
        ],
      },
    },
  },

  // ── Timeline ──────────────────────────────────────────────────────────────
  'example-timeline': {
    diagram: {
      en: {
        type: 'timeline',
        caption:
          'a launch week: soft launch on Monday, public launch Friday, retention review the next',
        legend: { main: 'launch event', branch: 'internal milestone' },
        events: [
          {
            id: 'kickoff',
            label: 'Internal kickoff',
            kind: 'internal',
            sublabel: 'mon',
            description: 'Team sync, runbook review and support shift assignment.',
          },
          {
            id: 'beta',
            label: 'Invite-only beta',
            kind: 'launch',
            sublabel: 'wed',
            variant: 'branch',
            description: 'A small group of customers tries the product and files issues.',
          },
          {
            id: 'public',
            label: 'Public launch',
            kind: 'launch',
            sublabel: 'fri',
            weight: 'primary',
            description: 'Full launch with monitoring, status page and social channels live.',
          },
          {
            id: 'week1',
            label: 'Week 1 review',
            kind: 'internal',
            sublabel: '+7d',
            description: 'Metrics review: activation, error budgets and support volume.',
          },
          {
            id: 'retention',
            label: 'Retention deep-dive',
            kind: 'internal',
            sublabel: '+30d',
            variant: 'branch',
            description: 'Cohort retention analysis and the roadmap for the next iteration.',
          },
        ],
      },
      es: {
        type: 'timeline',
        caption:
          'una semana de lanzamiento: soft launch el lunes, público el viernes y revisión de retención la siguiente',
        legend: { main: 'evento de lanzamiento', branch: 'hito interno' },
        events: [
          {
            id: 'kickoff',
            label: 'Kickoff interno',
            kind: 'interno',
            sublabel: 'lun',
            description: 'Sincronización del equipo, revisión del runbook y turnos de soporte.',
          },
          {
            id: 'beta',
            label: 'Beta por invitación',
            kind: 'lanzamiento',
            sublabel: 'mié',
            variant: 'branch',
            description: 'Un grupo pequeño de clientes prueba el producto y reporta incidencias.',
          },
          {
            id: 'public',
            label: 'Lanzamiento público',
            kind: 'lanzamiento',
            sublabel: 'vie',
            weight: 'primary',
            description:
              'Lanzamiento completo con monitorización, página de estado y redes activas.',
          },
          {
            id: 'week1',
            label: 'Revisión semana 1',
            kind: 'interno',
            sublabel: '+7d',
            description:
              'Revisión de métricas: activación, presupuesto de error y volumen de soporte.',
          },
          {
            id: 'retention',
            label: 'Análisis de retención',
            kind: 'interno',
            sublabel: '+30d',
            variant: 'branch',
            description:
              'Análisis de retención por cohortes y hoja de ruta de la siguiente iteración.',
          },
        ],
      },
    },
  },

  // ── Swimlane ──────────────────────────────────────────────────────────────
  'example-swimlane': {
    diagram: {
      en: {
        type: 'swimlane',
        caption: 'incident response across three teams: on-call, engineering and comms',
        legend: { main: 'escalation path', branch: 'async update' },
        lanes: [
          { id: 'oncall', label: 'On-call', kind: 'SRE' },
          { id: 'eng', label: 'Engineering', kind: 'Product' },
          { id: 'comms', label: 'Comms', kind: 'External' },
        ],
        nodes: [
          {
            id: 'page',
            lane: 'oncall',
            label: 'Alert page',
            description: 'The monitoring stack pages the on-call engineer.',
            kind: 'Trigger',
            sublabel: 'pagerduty',
            weight: 'primary',
          },
          {
            id: 'triage',
            lane: 'oncall',
            label: 'Triage',
            description: 'On-call confirms the incident and classifies its severity.',
            kind: 'Step',
            sublabel: 'sev2',
          },
          {
            id: 'escalate',
            lane: 'oncall',
            label: 'Escalate',
            description: 'Hands the incident to the owning engineering team.',
            kind: 'Step',
            sublabel: 'handoff',
          },
          {
            id: 'debug',
            lane: 'eng',
            label: 'Debug & fix',
            description: 'Engineering investigates and ships a fix to production.',
            kind: 'Step',
            sublabel: 'hotfix',
            weight: 'primary',
          },
          {
            id: 'notify',
            lane: 'comms',
            label: 'Notify users',
            description: 'Comms posts a status update and follows up on social channels.',
            kind: 'Step',
            sublabel: 'status page',
          },
          {
            id: 'postmortem',
            lane: 'eng',
            label: 'Postmortem',
            description: 'Engineering writes the incident report and action items.',
            kind: 'Outcome',
            sublabel: 'blameless',
          },
        ],
        edges: [
          { from: 'page', to: 'triage' },
          { from: 'triage', to: 'escalate' },
          { from: 'escalate', to: 'debug' },
          { from: 'debug', to: 'notify', variant: 'branch', dashed: true, label: 'comms' },
          { from: 'debug', to: 'postmortem' },
        ],
      },
      es: {
        type: 'swimlane',
        caption: 'respuesta a incidentes entre tres equipos: guardia, ingeniería y comunicación',
        legend: { main: 'ruta de escalado', branch: 'actualización async' },
        lanes: [
          { id: 'oncall', label: 'Guardia', kind: 'SRE' },
          { id: 'eng', label: 'Ingeniería', kind: 'Producto' },
          { id: 'comms', label: 'Comunicación', kind: 'Externo' },
        ],
        nodes: [
          {
            id: 'page',
            lane: 'oncall',
            label: 'Alerta',
            description: 'La monitorización avisa a la ingeniería de guardia.',
            kind: 'Disparador',
            sublabel: 'pagerduty',
            weight: 'primary',
          },
          {
            id: 'triage',
            lane: 'oncall',
            label: 'Triaje',
            description: 'La guardia confirma el incidente y clasifica su severidad.',
            kind: 'Paso',
            sublabel: 'sev2',
          },
          {
            id: 'escalate',
            lane: 'oncall',
            label: 'Escalar',
            description: 'Entrega el incidente al equipo de ingeniería propietario.',
            kind: 'Paso',
            sublabel: 'handoff',
          },
          {
            id: 'debug',
            lane: 'eng',
            label: 'Depurar y arreglar',
            description: 'Ingeniería investiga y publica un fix en producción.',
            kind: 'Paso',
            sublabel: 'hotfix',
            weight: 'primary',
          },
          {
            id: 'notify',
            lane: 'comms',
            label: 'Avisar usuarios',
            description: 'Comunicación publica una actualización de estado y sigue en redes.',
            kind: 'Paso',
            sublabel: 'status page',
          },
          {
            id: 'postmortem',
            lane: 'eng',
            label: 'Postmortem',
            description: 'Ingeniería escribe el informe del incidente y los pendientes.',
            kind: 'Resultado',
            sublabel: 'sin culpas',
          },
        ],
        edges: [
          { from: 'page', to: 'triage' },
          { from: 'triage', to: 'escalate' },
          { from: 'escalate', to: 'debug' },
          { from: 'debug', to: 'notify', variant: 'branch', dashed: true, label: 'comms' },
          { from: 'debug', to: 'postmortem' },
        ],
      },
    },
  },
}

/** Registers every example diagram under its `example-*` key. */
export function registerExampleDiagrams(): void {
  for (const [key, registration] of Object.entries(EXAMPLE_DIAGRAMS)) {
    registerDiagram(key, registration)
  }
}
