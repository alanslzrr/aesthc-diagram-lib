import type { BandDiagramSpec, DiagramNodeVisual } from './types'

type Locale = 'en' | 'es'
type Text = Record<Locale, string>
export type ArchitectureExample = {
  title: Text
  summary: Text
  notes: Record<Locale, string[]>
  diagram: Record<Locale, BandDiagramSpec>
  visuals: Record<string, DiagramNodeVisual>
  sources: { label: string; url: string }[]
}

function spanish(
  spec: BandDiagramSpec,
  caption: string,
  labels: Record<string, [string, string, string]>,
  edges: Record<string, string>,
): BandDiagramSpec {
  return {
    ...spec,
    caption,
    bands: spec.bands.map((band) => ({
      ...band,
      title:
        (
          {
            Upload: 'Subida',
            Events: 'Eventos',
            Processing: 'Proceso',
            Results: 'Resultados',
            Queue: 'Cola',
            Persistence: 'Persistencia',
            Source: 'Código',
            Artifacts: 'Artefactos',
          } as Record<string, string>
        )[band.title] ?? band.title,
    })),
    legend: { main: 'Flujo principal', branch: 'Excepción' },
    nodes: spec.nodes.map((node) => ({
      ...node,
      label: labels[node.id][0],
      kind: labels[node.id][1],
      description: labels[node.id][2],
    })),
    edges: spec.edges.map((edge) => ({ ...edge, label: edges[edge.id!] ?? edge.label })),
  }
}
const google = { source: 'thesvg', key: 'google-cloud' } as const
const azure = { source: 'thesvg', key: 'azure' } as const
const warning = { source: 'phosphor', key: 'warning' } as const

const documents: BandDiagramSpec = {
  type: 'band',
  caption: 'Document ingestion: object upload, event delivery, validation and analytics.',
  legend: { main: 'Accepted document', branch: 'Invalid document' },
  bands: [{ title: 'Upload' }, { title: 'Events' }, { title: 'Processing' }, { title: 'Results' }],
  nodes: [
    {
      id: 'upload',
      band: 0,
      label: 'Upload bucket',
      kind: 'Storage',
      sublabel: 'Cloud Storage',
      weight: 'primary',
      description:
        'Store the uploaded object; OBJECT_FINALIZE publishes its bucket, object and generation metadata, not the document bytes.',
    },
    {
      id: 'topic',
      band: 1,
      label: 'Ingestion events',
      kind: 'Messaging',
      sublabel: 'Pub/Sub',
      weight: 'primary',
      description:
        'Deliver object notifications to an authenticated Cloud Run push endpoint. Retries can deliver the same object generation more than once.',
    },
    {
      id: 'worker',
      band: 2,
      label: 'Document worker',
      kind: 'Compute',
      sublabel: 'Cloud Run',
      weight: 'primary',
      description:
        'Fetch the object, validate its schema and extract normalized records. Deduplicate by bucket, object and generation; acknowledge only after durable output.',
    },
    {
      id: 'warehouse',
      band: 3,
      label: 'Analytics records',
      kind: 'Warehouse',
      sublabel: 'BigQuery',
      weight: 'primary',
      description:
        'Store validated document records using an application-defined idempotent write strategy; a push subscription is not an exactly-once transaction.',
    },
    {
      id: 'quarantine',
      band: 3,
      label: 'Rejected objects',
      kind: 'Review',
      sublabel: 'Cloud Storage',
      description:
        'The worker writes the invalid object and validation reason to a separate bucket for investigation. This is application quarantine, not a Pub/Sub dead-letter topic.',
    },
  ],
  edges: [
    { id: 'finalize', from: 'upload', to: 'topic', label: 'finalized' },
    { id: 'push', from: 'topic', to: 'worker', label: 'OIDC push' },
    { id: 'write', from: 'worker', to: 'warehouse', label: 'valid rows' },
    {
      id: 'reject',
      from: 'worker',
      to: 'quarantine',
      label: 'bad schema',
      variant: 'branch',
      dashed: true,
    },
  ],
}
const orders: BandDiagramSpec = {
  type: 'band',
  caption:
    'Order fulfillment: asynchronous queue, worker, durable ledger and dead-letter handling.',
  legend: { main: 'Order processing', branch: 'Poison message' },
  bands: [{ title: 'API' }, { title: 'Queue' }, { title: 'Fulfillment' }, { title: 'Persistence' }],
  nodes: [
    {
      id: 'api',
      band: 0,
      label: 'Order API',
      kind: 'Ingress',
      sublabel: 'Container Apps',
      weight: 'primary',
      description:
        'Validate an authenticated order request and publish an order command to Service Bus. Return HTTP 202 only after the broker accepts the message.',
    },
    {
      id: 'queue',
      band: 1,
      label: 'Order commands',
      kind: 'Messaging',
      sublabel: 'Service Bus',
      weight: 'primary',
      description:
        'Buffer orders in a queue and deliver them under a peek-lock. The worker owns settlement and retries; scaling does not imply exactly-once processing.',
    },
    {
      id: 'worker',
      band: 2,
      label: 'Fulfillment worker',
      kind: 'Compute',
      sublabel: 'Container Apps Job',
      weight: 'primary',
      description:
        'An event-driven job consumes a locked command, persists an idempotent order result, then completes the message. Failed attempts can be redelivered.',
    },
    {
      id: 'ledger',
      band: 3,
      label: 'Order ledger',
      kind: 'Database',
      sublabel: 'Azure SQL',
      weight: 'primary',
      description:
        'Store one durable fulfillment result per order ID using a unique key and transaction. The SQL commit and broker completion are separate operations.',
    },
    {
      id: 'deadletter',
      band: 2,
      label: 'Dead-letter queue',
      kind: 'Operations',
      sublabel: 'Service Bus / DLQ',
      description:
        'Service Bus moves a message to its dead-letter subqueue when configured delivery attempts are exhausted. An operator investigates and explicitly replays corrected messages.',
    },
  ],
  edges: [
    { id: 'enqueue', from: 'api', to: 'queue', label: 'enqueue' },
    { id: 'consume', from: 'queue', to: 'worker', label: 'peek-lock' },
    { id: 'commit', from: 'worker', to: 'ledger', label: 'commit SQL' },
    {
      id: 'poison',
      from: 'queue',
      to: 'deadletter',
      label: 'retry limit',
      variant: 'branch',
      dashed: true,
    },
  ],
}
const delivery: BandDiagramSpec = {
  type: 'band',
  caption: 'Container delivery: commit, CI checks, immutable artifact and a Cloud Run revision.',
  legend: { main: 'Passing release', branch: 'Failed checks' },
  bands: [{ title: 'Source' }, { title: 'CI' }, { title: 'Artifacts' }, { title: 'Runtime' }],
  nodes: [
    {
      id: 'commit',
      band: 0,
      label: 'Merged commit',
      kind: 'Source',
      sublabel: 'GitHub / main',
      weight: 'primary',
      description:
        'A merge to main starts the release workflow with a specific commit SHA, so the artifact can be traced back to its source.',
    },
    {
      id: 'checks',
      band: 1,
      label: 'Test and build',
      kind: 'CI',
      sublabel: 'GitHub Actions',
      weight: 'primary',
      description:
        'Run type checks and tests before building a container image. Configure workload identity federation for the workflow to publish and deploy without a stored service-account key.',
    },
    {
      id: 'image',
      band: 2,
      label: 'Immutable image',
      kind: 'Registry',
      sublabel: 'Artifact Registry',
      weight: 'primary',
      description:
        'Publish the passing container image and capture its digest. The workflow deploys that digest, not a moving latest tag.',
    },
    {
      id: 'revision',
      band: 3,
      label: 'Service revision',
      kind: 'Runtime',
      sublabel: 'Cloud Run',
      weight: 'primary',
      description:
        'Deploy the recorded image digest as a new revision. IAM, rollout gates and traffic policy must be configured separately; this diagram does not promise an automatic safe rollout.',
    },
    {
      id: 'blocked',
      band: 2,
      label: 'Release blocked',
      kind: 'Failure',
      sublabel: 'workflow result',
      description:
        'Failed checks stop the publish/deploy jobs. The currently serving revision is unchanged.',
    },
  ],
  edges: [
    { id: 'trigger', from: 'commit', to: 'checks', label: 'commit SHA' },
    { id: 'publish', from: 'checks', to: 'image', label: 'CI passed' },
    { id: 'deploy', from: 'image', to: 'revision', label: 'digest' },
    {
      id: 'fail',
      from: 'checks',
      to: 'blocked',
      label: 'CI failed',
      variant: 'branch',
      dashed: true,
    },
  ],
}

/** Authored reference designs, not claims about a deployed production environment. */
export const ARCHITECTURE_EXAMPLES = {
  documents: {
    title: { en: 'Document ingestion', es: 'Ingesta de documentos' },
    summary: {
      en: 'Uploaded documents become validated analytics records; invalid files take a separate review path.',
      es: 'Los documentos subidos se convierten en registros analíticos; los archivos inválidos pasan a revisión.',
    },
    notes: {
      en: [
        'The event carries object metadata. The worker fetches the file and deduplicates by object generation.',
        'Quarantine is application-owned; transient processing errors retry through Pub/Sub.',
      ],
      es: [
        'El evento contiene metadatos. El worker lee el archivo y deduplica por generación del objeto.',
        'La cuarentena la gestiona la aplicación; los errores transitorios se reintentan con Pub/Sub.',
      ],
    },
    diagram: {
      en: documents,
      es: spanish(
        documents,
        'Ingesta: subida, eventos, validación y registros analíticos.',
        {
          upload: [
            'Bucket de entrada',
            'Almacenamiento',
            'Guardar el objeto y publicar sus metadatos al finalizar la subida, no sus bytes.',
          ],
          topic: [
            'Eventos de ingesta',
            'Mensajería',
            'Enviar notificaciones por push autenticado. La misma generación puede entregarse varias veces.',
          ],
          worker: [
            'Worker documental',
            'Cómputo',
            'Leer y validar el archivo. Deduplicar por bucket, objeto y generación; confirmar tras persistir la salida.',
          ],
          warehouse: [
            'Registros analíticos',
            'Warehouse',
            'Persistir registros válidos con una estrategia de escritura idempotente definida por la aplicación.',
          ],
          quarantine: [
            'Objetos rechazados',
            'Revisión',
            'Guardar el objeto inválido y su motivo en otro bucket. No es un dead-letter topic de Pub/Sub.',
          ],
        },
        { finalize: 'finalizado', push: 'push OIDC', write: 'filas OK', reject: 'inválido' },
      ),
    },
    visuals: {
      upload: google,
      topic: google,
      worker: google,
      warehouse: google,
      quarantine: warning,
    },
    sources: [
      {
        label: 'Storage events',
        url: 'https://docs.cloud.google.com/storage/docs/pubsub-notifications',
      },
      {
        label: 'Pub/Sub → Cloud Run',
        url: 'https://docs.cloud.google.com/run/docs/tutorials/pubsub',
      },
    ],
  },
  orders: {
    title: { en: 'Order fulfillment', es: 'Procesamiento de pedidos' },
    summary: {
      en: 'An order API queues work for an event-driven job; durable results and poison messages have distinct destinations.',
      es: 'Una API encola pedidos para un job por eventos; los resultados persistidos y los mensajes fallidos tienen destinos distintos.',
    },
    notes: {
      en: [
        'Return 202 after enqueue. Complete the message after the SQL commit; deduplicate by order ID.',
        'Investigate exhausted messages and explicitly replay them after correcting the failure.',
      ],
      es: [
        'Devolver 202 tras encolar. Confirmar el mensaje tras el commit SQL; deduplicar por ID de pedido.',
        'Investigar los mensajes agotados y reproducirlos explícitamente tras corregir el fallo.',
      ],
    },
    diagram: {
      en: orders,
      es: spanish(
        orders,
        'Pedidos: API, cola, job, persistencia y mensajes fallidos.',
        {
          api: [
            'API de pedidos',
            'Entrada',
            'Validar el pedido y publicarlo en Service Bus. Devolver HTTP 202 cuando el broker acepte el mensaje.',
          ],
          queue: [
            'Comandos de pedido',
            'Mensajería',
            'Entregar comandos con peek-lock. El worker gestiona confirmación y reintentos, sin asumir exactly-once.',
          ],
          worker: [
            'Job de fulfillment',
            'Cómputo',
            'Consumir el comando bloqueado, persistir un resultado idempotente y confirmar el mensaje tras el commit.',
          ],
          ledger: [
            'Registro de pedidos',
            'Base de datos',
            'Usar clave única por pedido y transacción. El commit SQL y la confirmación del broker son operaciones distintas.',
          ],
          deadletter: [
            'Cola de fallidos',
            'Operaciones',
            'Service Bus envía aquí mensajes tras agotar intentos. Investigar y reproducir explícitamente mensajes corregidos.',
          ],
        },
        {
          enqueue: 'encolar',
          consume: 'peek-lock',
          commit: 'commit SQL',
          poison: 'límite',
        },
      ),
    },
    visuals: { api: azure, queue: azure, worker: azure, ledger: azure, deadletter: warning },
    sources: [
      {
        label: 'Event-driven jobs',
        url: 'https://learn.microsoft.com/en-us/azure/container-apps/jobs',
      },
      {
        label: 'Service Bus DLQ',
        url: 'https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues',
      },
    ],
  },
  delivery: {
    title: { en: 'Container delivery', es: 'Entrega de contenedores' },
    summary: {
      en: 'A tested commit produces an immutable image and a service revision. Failed checks never reach deployment.',
      es: 'Un commit probado produce una imagen inmutable y una revisión. Los checks fallidos no llegan al despliegue.',
    },
    notes: {
      en: [
        'Publish and deploy by digest; configure workload identity rather than storing a service-account key.',
        'Traffic rollout and smoke gates are separate configuration, not guarantees implied by the arrows.',
      ],
      es: [
        'Publicar y desplegar por digest; configurar identidad federada en vez de almacenar una clave de servicio.',
        'El rollout de tráfico y los smoke gates se configuran aparte; las flechas no garantizan su implementación.',
      ],
    },
    diagram: {
      en: delivery,
      es: spanish(
        delivery,
        'Entrega: commit, checks, imagen inmutable y revisión de servicio.',
        {
          commit: [
            'Commit integrado',
            'Código',
            'Un merge a main activa el workflow para un SHA de commit concreto y trazable.',
          ],
          checks: [
            'Tests y build',
            'CI',
            'Ejecutar checks antes del build. Configurar identidad federada para publicar y desplegar sin claves persistidas.',
          ],
          image: [
            'Imagen inmutable',
            'Registry',
            'Publicar la imagen probada y capturar su digest. No desplegar una etiqueta latest mutable.',
          ],
          revision: [
            'Revisión de servicio',
            'Runtime',
            'Desplegar el digest como una revisión. IAM, gates y tráfico se configuran aparte.',
          ],
          blocked: [
            'Release bloqueada',
            'Fallo',
            'Los checks fallidos detienen la publicación y el despliegue; la revisión actual no cambia.',
          ],
        },
        {
          trigger: 'SHA',
          publish: 'CI OK',
          deploy: 'digest',
          fail: 'CI falló',
        },
      ),
    },
    visuals: {
      commit: { source: 'phosphor', key: 'graph' },
      checks: { source: 'phosphor', key: 'list-checks' },
      image: google,
      revision: google,
      blocked: warning,
    },
    sources: [
      {
        label: 'Container CI',
        url: 'https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images',
      },
      { label: 'Cloud Run revisions', url: 'https://docs.cloud.google.com/run/docs/deploying' },
    ],
  },
} satisfies Record<string, ArchitectureExample>
