'use client'
// src/showcase/Showcase.tsx
import { useEffect, useId as useId2, useMemo, useState as useState2 } from "react";

// src/registry.ts
var registry = /* @__PURE__ */ new Map();
function registerDiagram(key, registration) {
  const visuals = registration.visuals ?? {};
  registry.set(key, { diagram: registration.diagram, visuals });
}
function getDiagram(key, locale) {
  const entry = registry.get(key);
  if (!entry) throw new Error(`Unknown diagram key: ${key}`);
  return entry.diagram[locale.startsWith("es") ? "es" : "en"];
}
function getDiagramVisuals(key) {
  return registry.get(key)?.visuals ?? {};
}

// src/examples.ts
var EXAMPLE_DIAGRAMS = {
  // ── Band ──────────────────────────────────────────────────────────────────
  "example-band": {
    diagram: {
      en: {
        type: "band",
        caption: "a request pipeline: intake, validation, and a policy-gated outcome with an off-canvas retry",
        legend: { main: "request path", branch: "sandbox \xB7 retry" },
        bands: [
          { title: "Intake" },
          { title: "Validation" },
          { title: "Outcome" }
        ],
        nodes: [
          {
            id: "ingress",
            band: 0,
            label: "Ingress",
            description: "Authenticated API and manual uploads enter the same normalized request.",
            kind: "Trigger",
            sublabel: "api \xB7 upload",
            weight: "primary"
          },
          {
            id: "validate",
            band: 1,
            label: "Validate",
            description: "Deterministic checks plus an LLM pass confirm the request is well-formed.",
            kind: "Engine",
            sublabel: "rules \xB7 llm",
            weight: "primary"
          },
          {
            id: "approve",
            band: 2,
            label: "Approved",
            description: "The request passes policy and is persisted with its audit trail.",
            kind: "Outcome",
            sublabel: "persisted",
            weight: "primary"
          },
          {
            id: "quarantine",
            band: 2,
            label: "Quarantine",
            description: "Low-confidence requests pause for operator review instead of failing.",
            kind: "Outcome",
            sublabel: "review"
          }
        ],
        edges: [
          { from: "ingress", to: "validate" },
          { from: "validate", to: "approve", label: "pass", labelPlacement: "above-target" },
          {
            from: "validate",
            to: "quarantine",
            label: "uncertain",
            variant: "branch",
            dashed: true,
            labelPlacement: "below-target"
          }
        ],
        decisions: [{ id: "validate-pass", source: "validate", label: "valid?" }],
        continuations: [
          {
            id: "retry-ingress",
            from: "quarantine",
            label: "retry",
            destination: "ingress",
            side: "left",
            anchor: "lower",
            labelPlacement: "below-source",
            variant: "branch",
            ariaLabel: "operator retry returns the request to ingress"
          }
        ]
      },
      es: {
        type: "band",
        caption: "un pipeline de solicitudes: entrada, validaci\xF3n y un resultado regido por pol\xEDticas con reintento fuera de lienzo",
        legend: { main: "ruta de solicitud", branch: "prueba \xB7 reintento" },
        bands: [
          { title: "Entrada" },
          { title: "Validaci\xF3n" },
          { title: "Resultado" }
        ],
        nodes: [
          {
            id: "ingress",
            band: 0,
            label: "Entrada",
            description: "La API autenticada y las subidas manuales entran como una misma solicitud normalizada.",
            kind: "Disparador",
            sublabel: "api \xB7 subida",
            weight: "primary"
          },
          {
            id: "validate",
            band: 1,
            label: "Validar",
            description: "Comprobaciones deterministas m\xE1s un pase de LLM confirman que la solicitud es v\xE1lida.",
            kind: "Motor",
            sublabel: "reglas \xB7 llm",
            weight: "primary"
          },
          {
            id: "approve",
            band: 2,
            label: "Aprobado",
            description: "La solicitud supera la pol\xEDtica y se conserva con su registro de auditor\xEDa.",
            kind: "Resultado",
            sublabel: "persistido",
            weight: "primary"
          },
          {
            id: "quarantine",
            band: 2,
            label: "Cuarentena",
            description: "Las solicitudes con poca confianza esperan revisi\xF3n del operador en vez de fallar.",
            kind: "Resultado",
            sublabel: "revisi\xF3n"
          }
        ],
        edges: [
          { from: "ingress", to: "validate" },
          { from: "validate", to: "approve", label: "v\xE1lido", labelPlacement: "above-target" },
          {
            from: "validate",
            to: "quarantine",
            label: "dudoso",
            variant: "branch",
            dashed: true,
            labelPlacement: "below-target"
          }
        ],
        decisions: [{ id: "validate-pass", source: "validate", label: "\xBFv\xE1lido?" }],
        continuations: [
          {
            id: "retry-ingress",
            from: "quarantine",
            label: "reintentar",
            destination: "entrada",
            side: "left",
            anchor: "lower",
            labelPlacement: "below-source",
            variant: "branch",
            ariaLabel: "el reintento del operador devuelve la solicitud a la entrada"
          }
        ]
      }
    },
    visuals: {
      ingress: { source: "phosphor", key: "folder-lock" },
      validate: { source: "phosphor", key: "gauge" },
      approve: { source: "phosphor", key: "seal-check" },
      quarantine: { source: "phosphor", key: "warning" }
    }
  },
  // ── Flowchart ─────────────────────────────────────────────────────────────
  "example-flowchart": {
    diagram: {
      en: {
        type: "flowchart",
        direction: "top-down",
        caption: "a deploy pipeline with a smoke gate: preview \u2192 tests \u2192 manual approval \u2192 canary \u2192 production",
        legend: { main: "happy path", branch: "rollback \xB7 failure" },
        nodes: [
          {
            id: "start",
            label: "Merge to main",
            description: "Every merge to the main branch triggers the pipeline.",
            kind: "Trigger",
            sublabel: "git push",
            shape: "terminal",
            weight: "primary"
          },
          {
            id: "build",
            label: "Build + lint",
            description: "Compiles the application and runs the linter with type checking.",
            kind: "CI",
            sublabel: "tsc \xB7 eslint"
          },
          {
            id: "tests",
            label: "Test suite",
            description: "Runs unit and integration tests against an ephemeral database.",
            kind: "CI",
            sublabel: "vitest"
          },
          {
            id: "smoke",
            label: "Smoke gate",
            description: "Deploys a preview and probes the critical paths before anything ships.",
            kind: "Gate",
            sublabel: "preview probes",
            weight: "primary"
          },
          {
            id: "approve",
            label: "Manual approval",
            description: "A human reviews the preview and approves the canary rollout.",
            kind: "Review",
            sublabel: "operator"
          },
          {
            id: "canary",
            label: "Canary 5%",
            description: "Routes a small share of traffic while error budgets are watched.",
            kind: "Deploy",
            sublabel: "10 min window",
            weight: "primary"
          },
          {
            id: "prod",
            label: "Production",
            description: "Promotes the canary to full production traffic.",
            kind: "Deploy",
            sublabel: "100%",
            weight: "primary"
          },
          {
            id: "rollback",
            label: "Rollback",
            description: "Reverts the canary to the previous revision when the gate fails.",
            kind: "Failure",
            sublabel: "previous revision",
            weight: "secondary"
          }
        ],
        edges: [
          { from: "start", to: "build" },
          { from: "build", to: "tests" },
          { from: "tests", to: "smoke" },
          { from: "smoke", to: "approve" },
          { from: "smoke", to: "rollback", label: "probe failed", variant: "branch", dashed: true },
          { from: "approve", to: "canary" },
          { from: "approve", to: "rollback", label: "rejected", variant: "branch", dashed: true },
          { from: "canary", to: "prod", label: "healthy" },
          { from: "canary", to: "rollback", label: "budget exceeded", variant: "branch", dashed: true },
          { from: "rollback", to: "start", label: "fix forward", variant: "branch", dashed: true }
        ]
      },
      es: {
        type: "flowchart",
        direction: "top-down",
        caption: "un pipeline de despliegue con puerta de humo: preview \u2192 pruebas \u2192 aprobaci\xF3n manual \u2192 canary \u2192 producci\xF3n",
        legend: { main: "camino feliz", branch: "rollback \xB7 fallo" },
        nodes: [
          {
            id: "start",
            label: "Merge a main",
            description: "Cada merge a la rama principal dispara el pipeline.",
            kind: "Disparador",
            sublabel: "git push",
            shape: "terminal",
            weight: "primary"
          },
          {
            id: "build",
            label: "Build + lint",
            description: "Compila la aplicaci\xF3n y ejecuta el linter con verificaci\xF3n de tipos.",
            kind: "CI",
            sublabel: "tsc \xB7 eslint"
          },
          {
            id: "tests",
            label: "Suite de pruebas",
            description: "Ejecuta pruebas unitarias y de integraci\xF3n contra una base ef\xEDmera.",
            kind: "CI",
            sublabel: "vitest"
          },
          {
            id: "smoke",
            label: "Puerta de humo",
            description: "Despliega un preview y sondea las rutas cr\xEDticas antes de publicar.",
            kind: "Control",
            sublabel: "sondas preview",
            weight: "primary"
          },
          {
            id: "approve",
            label: "Aprobaci\xF3n manual",
            description: "Una persona revisa el preview y aprueba el lanzamiento canary.",
            kind: "Revisi\xF3n",
            sublabel: "operador"
          },
          {
            id: "canary",
            label: "Canary 5%",
            description: "Enruta una peque\xF1a parte del tr\xE1fico mientras se vigila el presupuesto de error.",
            kind: "Despliegue",
            sublabel: "ventana 10 min",
            weight: "primary"
          },
          {
            id: "prod",
            label: "Producci\xF3n",
            description: "Promueve el canary al tr\xE1fico completo de producci\xF3n.",
            kind: "Despliegue",
            sublabel: "100%",
            weight: "primary"
          },
          {
            id: "rollback",
            label: "Rollback",
            description: "Revierte el canary a la revisi\xF3n anterior si la puerta falla.",
            kind: "Fallo",
            sublabel: "revisi\xF3n previa",
            weight: "secondary"
          }
        ],
        edges: [
          { from: "start", to: "build" },
          { from: "build", to: "tests" },
          { from: "tests", to: "smoke" },
          { from: "smoke", to: "approve" },
          { from: "smoke", to: "rollback", label: "sonda fall\xF3", variant: "branch", dashed: true },
          { from: "approve", to: "canary" },
          { from: "approve", to: "rollback", label: "rechazado", variant: "branch", dashed: true },
          { from: "canary", to: "prod", label: "sano" },
          { from: "canary", to: "rollback", label: "presupuesto", variant: "branch", dashed: true },
          { from: "rollback", to: "start", label: "corregir", variant: "branch", dashed: true }
        ]
      }
    },
    visuals: {
      start: { source: "phosphor", key: "rocket-launch" },
      build: { source: "phosphor", key: "list-checks" },
      tests: { source: "phosphor", key: "seal-check" },
      smoke: { source: "phosphor", key: "gauge" },
      approve: { source: "phosphor", key: "user-check" },
      canary: { source: "phosphor", key: "arrows-split" },
      prod: { source: "phosphor", key: "scales" },
      rollback: { source: "phosphor", key: "warning" }
    }
  },
  // ── Sequence ──────────────────────────────────────────────────────────────
  "example-sequence": {
    diagram: {
      en: {
        type: "sequence",
        caption: "a checkout flow: the client talks to the API, the API to the payment provider, and webhooks reconcile the order",
        legend: { main: "request \xB7 event", branch: "failure \xB7 retry" },
        participants: [
          { id: "client", label: "Client", kind: "Web" },
          { id: "api", label: "API", kind: "Next.js" },
          { id: "pay", label: "Payments", kind: "Stripe" },
          { id: "db", label: "Orders", kind: "Postgres" }
        ],
        messages: [
          { id: "checkout", from: "client", to: "api", label: "POST /checkout", activation: true },
          { id: "intent", from: "api", to: "pay", label: "create intent", activation: true },
          { id: "confirm", from: "client", to: "pay", label: "confirm card" },
          { id: "webhook", from: "pay", to: "api", label: "payment.succeeded", variant: "branch" },
          { id: "persist", from: "api", to: "db", label: "INSERT order", activation: true },
          { id: "ack", from: "db", to: "api", label: "committed" },
          { id: "done", from: "api", to: "client", label: "201 order", activation: true }
        ]
      },
      es: {
        type: "sequence",
        caption: "un flujo de checkout: el cliente habla con la API, la API con el proveedor de pagos y los webhooks concilian el pedido",
        legend: { main: "solicitud \xB7 evento", branch: "fallo \xB7 reintento" },
        participants: [
          { id: "client", label: "Cliente", kind: "Web" },
          { id: "api", label: "API", kind: "Next.js" },
          { id: "pay", label: "Pagos", kind: "Stripe" },
          { id: "db", label: "Pedidos", kind: "Postgres" }
        ],
        messages: [
          { id: "checkout", from: "client", to: "api", label: "POST /checkout", activation: true },
          { id: "intent", from: "api", to: "pay", label: "crear intent", activation: true },
          { id: "confirm", from: "client", to: "pay", label: "confirmar tarjeta" },
          { id: "webhook", from: "pay", to: "api", label: "payment.succeeded", variant: "branch" },
          { id: "persist", from: "api", to: "db", label: "INSERT pedido", activation: true },
          { id: "ack", from: "db", to: "api", label: "confirmado" },
          { id: "done", from: "api", to: "client", label: "201 pedido", activation: true }
        ]
      }
    },
    visuals: {
      client: { source: "phosphor", key: "monitor" },
      api: { source: "svgl", key: "nextjs" },
      pay: { source: "phosphor", key: "receipt" },
      db: { source: "svgl", key: "postgresql" }
    }
  },
  // ── State machine ─────────────────────────────────────────────────────────
  "example-state-machine": {
    diagram: {
      en: {
        type: "state-machine",
        caption: "an order lifecycle with a cancelled sink state and an expiry timer",
        legend: { main: "valid transition", branch: "timeout \xB7 cancel" },
        states: [
          { id: "created", label: "Created", kind: "Start", initial: true, description: "The order is persisted but not yet paid." },
          { id: "payment", label: "Payment pending", kind: "Awaiting", description: "Waiting for the payment provider confirmation." },
          { id: "paid", label: "Paid", kind: "Confirmed", weight: "primary", description: "Payment succeeded; the order is ready to fulfil." },
          { id: "shipped", label: "Shipped", kind: "Fulfilment", description: "The carrier has the parcel." },
          { id: "delivered", label: "Delivered", kind: "Done", weight: "primary", final: true, description: "The customer received the order." },
          { id: "cancelled", label: "Cancelled", kind: "Sink", final: true, description: "Terminal state; no further transitions." }
        ],
        transitions: [
          { from: "created", to: "payment", label: "checkout" },
          { from: "payment", to: "paid", label: "paid" },
          { from: "payment", to: "cancelled", label: "expired", variant: "branch", dashed: true },
          { from: "paid", to: "shipped", label: "label" },
          { from: "shipped", to: "delivered", label: "signed" },
          { from: "created", to: "cancelled", label: "cancel", variant: "branch" },
          { from: "paid", to: "cancelled", label: "refund", variant: "branch", dashed: true }
        ]
      },
      es: {
        type: "state-machine",
        caption: "un ciclo de vida de pedido con estado final cancelado y temporizador de expiraci\xF3n",
        legend: { main: "transici\xF3n v\xE1lida", branch: "tiempo \xB7 cancelar" },
        states: [
          { id: "created", label: "Creado", kind: "Inicio", initial: true, description: "El pedido se conserva pero a\xFAn no se ha pagado." },
          { id: "payment", label: "Pago pendiente", kind: "Espera", description: "Esperando la confirmaci\xF3n del proveedor de pagos." },
          { id: "paid", label: "Pagado", kind: "Confirmado", weight: "primary", description: "El pago se complet\xF3; el pedido est\xE1 listo para despacho." },
          { id: "shipped", label: "Enviado", kind: "Despacho", description: "El transportista tiene el paquete." },
          { id: "delivered", label: "Entregado", kind: "Final", weight: "primary", final: true, description: "El cliente recibi\xF3 el pedido." },
          { id: "cancelled", label: "Cancelado", kind: "Sumidero", final: true, description: "Estado terminal; sin m\xE1s transiciones." }
        ],
        transitions: [
          { from: "created", to: "payment", label: "checkout" },
          { from: "payment", to: "paid", label: "pagado" },
          { from: "payment", to: "cancelled", label: "expirado", variant: "branch", dashed: true },
          { from: "paid", to: "shipped", label: "etiqueta" },
          { from: "shipped", to: "delivered", label: "firmado" },
          { from: "created", to: "cancelled", label: "cancelar", variant: "branch" },
          { from: "paid", to: "cancelled", label: "reembolso", variant: "branch", dashed: true }
        ]
      }
    }
  },
  // ── ER / data model ───────────────────────────────────────────────────────
  "example-er": {
    diagram: {
      en: {
        type: "er",
        caption: "the catalog schema: products, categories, variants and stock lines",
        legend: { main: "relation", branch: "optional" },
        entities: [
          {
            id: "products",
            label: "products",
            kind: "table",
            weight: "primary",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "slug", type: "varchar(120)", key: "unique" },
              { name: "name", type: "text" },
              { name: "price_cents", type: "int" }
            ]
          },
          {
            id: "categories",
            label: "categories",
            kind: "table",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "parent_id", type: "uuid", key: "fk" },
              { name: "title", type: "varchar(80)" }
            ]
          },
          {
            id: "product_categories",
            label: "product_categories",
            kind: "table",
            fields: [
              { name: "product_id", type: "uuid", key: "fk" },
              { name: "category_id", type: "uuid", key: "fk" }
            ]
          },
          {
            id: "variants",
            label: "variants",
            kind: "table",
            weight: "primary",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "product_id", type: "uuid", key: "fk" },
              { name: "sku", type: "varchar(40)", key: "unique" },
              { name: "options", type: "jsonb" }
            ]
          },
          {
            id: "stock",
            label: "stock_lines",
            kind: "table",
            fields: [
              { name: "variant_id", type: "uuid", key: "fk" },
              { name: "warehouse", type: "varchar(20)" },
              { name: "qty", type: "int" }
            ]
          }
        ],
        relations: [
          { from: "products", to: "product_categories", label: "N" },
          { from: "categories", to: "product_categories", label: "1" },
          { from: "products", to: "variants", label: "1\u2014N" },
          { from: "variants", to: "stock", label: "1\u2014N", variant: "branch" }
        ]
      },
      es: {
        type: "er",
        caption: "el esquema del cat\xE1logo: productos, categor\xEDas, variantes y l\xEDneas de stock",
        legend: { main: "relaci\xF3n", branch: "opcional" },
        entities: [
          {
            id: "products",
            label: "products",
            kind: "tabla",
            weight: "primary",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "slug", type: "varchar(120)", key: "unique" },
              { name: "name", type: "text" },
              { name: "price_cents", type: "int" }
            ]
          },
          {
            id: "categories",
            label: "categories",
            kind: "tabla",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "parent_id", type: "uuid", key: "fk" },
              { name: "title", type: "varchar(80)" }
            ]
          },
          {
            id: "product_categories",
            label: "product_categories",
            kind: "tabla",
            fields: [
              { name: "product_id", type: "uuid", key: "fk" },
              { name: "category_id", type: "uuid", key: "fk" }
            ]
          },
          {
            id: "variants",
            label: "variants",
            kind: "tabla",
            weight: "primary",
            fields: [
              { name: "id", type: "uuid", key: "pk" },
              { name: "product_id", type: "uuid", key: "fk" },
              { name: "sku", type: "varchar(40)", key: "unique" },
              { name: "options", type: "jsonb" }
            ]
          },
          {
            id: "stock",
            label: "stock_lines",
            kind: "tabla",
            fields: [
              { name: "variant_id", type: "uuid", key: "fk" },
              { name: "warehouse", type: "varchar(20)" },
              { name: "qty", type: "int" }
            ]
          }
        ],
        relations: [
          { from: "products", to: "product_categories", label: "N" },
          { from: "categories", to: "product_categories", label: "1" },
          { from: "products", to: "variants", label: "1\u2014N" },
          { from: "variants", to: "stock", label: "1\u2014N", variant: "branch" }
        ]
      }
    }
  },
  // ── Timeline ──────────────────────────────────────────────────────────────
  "example-timeline": {
    diagram: {
      en: {
        type: "timeline",
        caption: "a launch week: soft launch on Monday, public launch Friday, retention review the next",
        legend: { main: "launch event", branch: "internal milestone" },
        events: [
          {
            id: "kickoff",
            label: "Internal kickoff",
            kind: "internal",
            sublabel: "mon",
            description: "Team sync, runbook review and support shift assignment."
          },
          {
            id: "beta",
            label: "Invite-only beta",
            kind: "launch",
            sublabel: "wed",
            variant: "branch",
            description: "A small group of customers tries the product and files issues."
          },
          {
            id: "public",
            label: "Public launch",
            kind: "launch",
            sublabel: "fri",
            weight: "primary",
            description: "Full launch with monitoring, status page and social channels live."
          },
          {
            id: "week1",
            label: "Week 1 review",
            kind: "internal",
            sublabel: "+7d",
            description: "Metrics review: activation, error budgets and support volume."
          },
          {
            id: "retention",
            label: "Retention deep-dive",
            kind: "internal",
            sublabel: "+30d",
            variant: "branch",
            description: "Cohort retention analysis and the roadmap for the next iteration."
          }
        ]
      },
      es: {
        type: "timeline",
        caption: "una semana de lanzamiento: soft launch el lunes, p\xFAblico el viernes y revisi\xF3n de retenci\xF3n la siguiente",
        legend: { main: "evento de lanzamiento", branch: "hito interno" },
        events: [
          {
            id: "kickoff",
            label: "Kickoff interno",
            kind: "interno",
            sublabel: "lun",
            description: "Sincronizaci\xF3n del equipo, revisi\xF3n del runbook y turnos de soporte."
          },
          {
            id: "beta",
            label: "Beta por invitaci\xF3n",
            kind: "lanzamiento",
            sublabel: "mi\xE9",
            variant: "branch",
            description: "Un grupo peque\xF1o de clientes prueba el producto y reporta incidencias."
          },
          {
            id: "public",
            label: "Lanzamiento p\xFAblico",
            kind: "lanzamiento",
            sublabel: "vie",
            weight: "primary",
            description: "Lanzamiento completo con monitorizaci\xF3n, p\xE1gina de estado y redes activas."
          },
          {
            id: "week1",
            label: "Revisi\xF3n semana 1",
            kind: "interno",
            sublabel: "+7d",
            description: "Revisi\xF3n de m\xE9tricas: activaci\xF3n, presupuesto de error y volumen de soporte."
          },
          {
            id: "retention",
            label: "An\xE1lisis de retenci\xF3n",
            kind: "interno",
            sublabel: "+30d",
            variant: "branch",
            description: "An\xE1lisis de retenci\xF3n por cohortes y hoja de ruta de la siguiente iteraci\xF3n."
          }
        ]
      }
    }
  },
  // ── Swimlane ──────────────────────────────────────────────────────────────
  "example-swimlane": {
    diagram: {
      en: {
        type: "swimlane",
        caption: "incident response across three teams: on-call, engineering and comms",
        legend: { main: "escalation path", branch: "async update" },
        lanes: [
          { id: "oncall", label: "On-call", kind: "SRE" },
          { id: "eng", label: "Engineering", kind: "Product" },
          { id: "comms", label: "Comms", kind: "External" }
        ],
        nodes: [
          {
            id: "page",
            lane: "oncall",
            label: "Alert page",
            description: "The monitoring stack pages the on-call engineer.",
            kind: "Trigger",
            sublabel: "pagerduty",
            weight: "primary"
          },
          {
            id: "triage",
            lane: "oncall",
            label: "Triage",
            description: "On-call confirms the incident and classifies its severity.",
            kind: "Step",
            sublabel: "sev2"
          },
          {
            id: "escalate",
            lane: "oncall",
            label: "Escalate",
            description: "Hands the incident to the owning engineering team.",
            kind: "Step",
            sublabel: "handoff"
          },
          {
            id: "debug",
            lane: "eng",
            label: "Debug & fix",
            description: "Engineering investigates and ships a fix to production.",
            kind: "Step",
            sublabel: "hotfix",
            weight: "primary"
          },
          {
            id: "notify",
            lane: "comms",
            label: "Notify users",
            description: "Comms posts a status update and follows up on social channels.",
            kind: "Step",
            sublabel: "status page"
          },
          {
            id: "postmortem",
            lane: "eng",
            label: "Postmortem",
            description: "Engineering writes the incident report and action items.",
            kind: "Outcome",
            sublabel: "blameless"
          }
        ],
        edges: [
          { from: "page", to: "triage" },
          { from: "triage", to: "escalate" },
          { from: "escalate", to: "debug" },
          { from: "debug", to: "notify", variant: "branch", dashed: true, label: "comms" },
          { from: "debug", to: "postmortem" }
        ]
      },
      es: {
        type: "swimlane",
        caption: "respuesta a incidentes entre tres equipos: guardia, ingenier\xEDa y comunicaci\xF3n",
        legend: { main: "ruta de escalado", branch: "actualizaci\xF3n async" },
        lanes: [
          { id: "oncall", label: "Guardia", kind: "SRE" },
          { id: "eng", label: "Ingenier\xEDa", kind: "Producto" },
          { id: "comms", label: "Comunicaci\xF3n", kind: "Externo" }
        ],
        nodes: [
          {
            id: "page",
            lane: "oncall",
            label: "Alerta",
            description: "La monitorizaci\xF3n avisa a la ingenier\xEDa de guardia.",
            kind: "Disparador",
            sublabel: "pagerduty",
            weight: "primary"
          },
          {
            id: "triage",
            lane: "oncall",
            label: "Triaje",
            description: "La guardia confirma el incidente y clasifica su severidad.",
            kind: "Paso",
            sublabel: "sev2"
          },
          {
            id: "escalate",
            lane: "oncall",
            label: "Escalar",
            description: "Entrega el incidente al equipo de ingenier\xEDa propietario.",
            kind: "Paso",
            sublabel: "handoff"
          },
          {
            id: "debug",
            lane: "eng",
            label: "Depurar y arreglar",
            description: "Ingenier\xEDa investiga y publica un fix en producci\xF3n.",
            kind: "Paso",
            sublabel: "hotfix",
            weight: "primary"
          },
          {
            id: "notify",
            lane: "comms",
            label: "Avisar usuarios",
            description: "Comunicaci\xF3n publica una actualizaci\xF3n de estado y sigue en redes.",
            kind: "Paso",
            sublabel: "status page"
          },
          {
            id: "postmortem",
            lane: "eng",
            label: "Postmortem",
            description: "Ingenier\xEDa escribe el informe del incidente y los pendientes.",
            kind: "Resultado",
            sublabel: "sin culpas"
          }
        ],
        edges: [
          { from: "page", to: "triage" },
          { from: "triage", to: "escalate" },
          { from: "escalate", to: "debug" },
          { from: "debug", to: "notify", variant: "branch", dashed: true, label: "comms" },
          { from: "debug", to: "postmortem" }
        ]
      }
    }
  }
};
function registerExampleDiagrams() {
  for (const [key, registration] of Object.entries(EXAMPLE_DIAGRAMS)) {
    registerDiagram(key, registration);
  }
}

// src/theme.ts
var CARD_W = 240;
var CARD_H_FULL = 88;
var CARD_H_SLIM = 64;
var CARD_R = 10;
var CARD_TEXT_X = 50;
var BAND_X0 = 40;
var BAND_PITCH = 338;
var SLOT_PITCH = 132;
var CONTENT_TOP = 56;
var CANVAS_BOTTOM_PAD = 56;
var CANVAS_MIN_WIDTH = 1360;
var NODE_ICON_SIZE = 22;
var EDGE_STROKE_WIDTH = 0.9;
var SIDE_LANE_GAP = 10;
var LANE_R = 6;
var DIMMED_OPACITY = 0.22;
var CONTINUATION_LENGTH = 44;
var CONTINUATION_PORT_INSET = 16;
var CONTINUATION_LABEL_OFFSET = 16;
var CONTINUATION_LABEL_GAP = 8;
var LABEL_CHAR_WIDTH = 6.25;
var LABEL_HORIZONTAL_PADDING = 18;
var LABEL_EDGE_GAP = 8;
var PILL_H = 20;
var PILL_R = 10;
var DECISION_PILL_H = 24;
var DECISION_PILL_R = 12;
var FLOW_GAP_X = 96;
var FLOW_GAP_Y = 72;
var TIMELINE_EVENT_GAP = 180;
var TIMELINE_ALT_OFFSET = 96;
var DOT_R = 6;
var MESSAGE_PITCH = 56;
var SWIMLANE_HEADER_W = 140;
var SWIMLANE_PAD = 24;
var SWIMLANE_ROW_PAD = 64;

// src/layout.ts
var edgeId = (edge) => `${edge.from}::${edge.to}`;
var labelPillWidth = (label) => label.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING;
var nodeHeight = (node) => node.sublabel ? CARD_H_FULL : CARD_H_SLIM;
var isMutedNode = (node) => node.weight === "muted";
var connectY = (node, side) => {
  if (isMutedNode(node)) return side === "top" ? node.y : node.y + node.h;
  if (side === "top") return node.y;
  if (side === "bottom") return node.y + node.h;
  return node.cy;
};
function roundedPolyline(pts, r = LANE_R) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    if (inLen === 0 || outLen === 0) continue;
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const t1x = cx + (px - cx) / inLen * rr;
    const t1y = cy + (py - cy) / inLen * rr;
    const t2x = cx + (nx - cx) / outLen * rr;
    const t2y = cy + (ny - cy) / outLen * rr;
    d += ` L ${t1x} ${t1y} Q ${cx} ${cy}, ${t2x} ${t2y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}
function splitBackEdges(nodes, edges) {
  const out = /* @__PURE__ */ new Map();
  for (const node of nodes) out.set(node.id, []);
  for (const edge of edges) out.get(edge.from)?.push(edge);
  const state = /* @__PURE__ */ new Map();
  const back = /* @__PURE__ */ new Set();
  const visit = (id) => {
    state.set(id, 1);
    for (const edge of out.get(id) ?? []) {
      const targetState = state.get(edge.to) ?? 0;
      if (targetState === 1) back.add(edge);
      else if (targetState === 0 && out.has(edge.to)) visit(edge.to);
    }
    state.set(id, 2);
  };
  for (const node of nodes) {
    if ((state.get(node.id) ?? 0) === 0) visit(node.id);
  }
  return {
    forward: edges.filter((edge) => !back.has(edge)),
    back: edges.filter((edge) => back.has(edge))
  };
}
function buildAdjacency(edges) {
  const out = /* @__PURE__ */ new Map();
  const incoming = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const forward = out.get(edge.from);
    if (forward) forward.push(edge.to);
    else out.set(edge.from, [edge.to]);
    const backward = incoming.get(edge.to);
    if (backward) backward.push(edge.from);
    else incoming.set(edge.to, [edge.from]);
  }
  return { out, in: incoming };
}
function diagramEdges(spec) {
  if (!("type" in spec)) return spec.edges;
  switch (spec.type) {
    case "sequence":
      return spec.messages;
    case "state-machine":
      return spec.transitions;
    case "er":
      return spec.relations;
    case "timeline":
      return [];
    case "band":
    case "flowchart":
    case "swimlane":
      return spec.edges;
    default:
      return spec.edges;
  }
}
function connectedIds(nodeId, adjacency) {
  const nodes = /* @__PURE__ */ new Set([nodeId]);
  const edges = /* @__PURE__ */ new Set();
  const walk = (direction) => {
    const queue = [nodeId];
    const seen = /* @__PURE__ */ new Set([nodeId]);
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbours = adjacency[direction].get(current) ?? [];
      for (const next of neighbours) {
        edges.add(direction === "out" ? `${current}::${next}` : `${next}::${current}`);
        nodes.add(next);
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  };
  walk("out");
  walk("in");
  return { nodes, edges };
}

// src/layouts/band.ts
function canvasMetrics(diagram) {
  const perBand = diagram.bands.map(
    (_band, index) => diagram.nodes.filter((node) => node.band === index).length
  );
  const maxSlots = Math.max(1, ...perBand);
  const contentHeight = (maxSlots - 1) * SLOT_PITCH + CARD_H_FULL;
  return {
    height: CONTENT_TOP + contentHeight + CANVAS_BOTTOM_PAD,
    midline: CONTENT_TOP + contentHeight / 2
  };
}
function placeBandEdges(diagram, nodes) {
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const edges = [];
  for (const edge of diagram.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    let d;
    let labelX;
    let labelY;
    let fromSide;
    let toSide;
    let startX;
    let startY;
    let endX;
    let endY;
    let routePoints;
    if (from.band === to.band) {
      const adjacent = Math.abs(from.slot - to.slot) === 1;
      if (adjacent) {
        const movingDown = to.cy > from.cy;
        fromSide = movingDown ? "bottom" : "top";
        toSide = movingDown ? "top" : "bottom";
        const ax = from.cx;
        const ay = connectY(from, fromSide);
        const bx = to.cx;
        const by = connectY(to, toSide);
        startX = ax;
        startY = ay;
        endX = bx;
        endY = by;
        const controlY = Math.abs(by - ay) * 0.5;
        d = movingDown ? `M ${ax} ${ay} C ${ax} ${ay + controlY}, ${bx} ${by - controlY}, ${bx} ${by}` : `M ${ax} ${ay} C ${ax} ${ay - controlY}, ${bx} ${by + controlY}, ${bx} ${by}`;
        labelX = (ax + bx) / 2;
        labelY = (ay + by) / 2;
      } else {
        const useRightLane = from.band >= diagram.bands.length / 2;
        fromSide = useRightLane ? "right" : "left";
        toSide = useRightLane ? "right" : "left";
        const ax = useRightLane ? from.x + from.w : from.x;
        const bx = useRightLane ? to.x + to.w : to.x;
        const laneX = useRightLane ? from.x + from.w + SIDE_LANE_GAP : from.x - SIDE_LANE_GAP;
        const fromY = connectY(from, fromSide);
        const toY = connectY(to, toSide);
        startX = ax;
        startY = fromY;
        endX = bx;
        endY = toY;
        d = roundedPolyline(
          [
            [ax, fromY],
            [laneX, fromY],
            [laneX, toY],
            [bx, toY]
          ],
          LANE_R
        );
        labelX = laneX;
        labelY = (fromY + toY) / 2;
      }
    } else if (edge.route) {
      const movingRight = to.x > from.x;
      fromSide = movingRight ? "right" : "left";
      toSide = movingRight ? "left" : "right";
      const ax = movingRight ? from.x + from.w : from.x;
      const ay = connectY(from, fromSide);
      const bx = movingRight ? to.x : to.x + to.w;
      const by = connectY(to, toSide);
      startX = ax;
      startY = ay;
      endX = bx;
      endY = by;
      const minBand = Math.min(from.band, to.band);
      const maxBand = Math.max(from.band, to.band);
      const obstacles = nodes.filter((node) => node.band > minBand && node.band < maxBand).sort((a, b) => movingRight ? a.x - b.x : b.x - a.x);
      if (obstacles.length === 0) {
        const controlX = (ax + bx) / 2;
        d = `M ${ax} ${ay} C ${controlX} ${ay}, ${controlX} ${by}, ${bx} ${by}`;
        labelX = (ax + bx) / 2;
        labelY = (ay + by) / 2;
      } else {
        const clearance = edge.route.clearance ?? SIDE_LANE_GAP;
        const first = obstacles[0];
        const last = obstacles[obstacles.length - 1];
        const entryX = movingRight ? first.x - clearance : first.x + first.w + clearance;
        const exitX = movingRight ? last.x + last.w + clearance : last.x - clearance;
        const laneY = edge.route.lane === "above" ? Math.min(...obstacles.map((node) => node.y)) - clearance : Math.max(...obstacles.map((node) => node.y + node.h)) + clearance;
        routePoints = [
          [ax, ay],
          [entryX, ay],
          [entryX, laneY],
          [exitX, laneY],
          [exitX, by],
          [bx, by]
        ];
        d = roundedPolyline(routePoints, LANE_R);
        labelX = (entryX + exitX) / 2;
        labelY = laneY;
      }
    } else {
      fromSide = "right";
      toSide = "left";
      const ax = from.x + from.w;
      const ay = connectY(from, fromSide);
      const bx = to.x;
      const by = connectY(to, toSide);
      startX = ax;
      startY = ay;
      endX = bx;
      endY = by;
      const controlX = (ax + bx) / 2;
      d = `M ${ax} ${ay} C ${controlX} ${ay}, ${controlX} ${by}, ${bx} ${by}`;
      labelX = (ax + bx) / 2;
      labelY = (ay + by) / 2;
    }
    if (edge.labelPlacement === "above-target") {
      labelX = to.cx;
      labelY = to.y - 17;
    } else if (edge.labelPlacement === "below-target") {
      labelX = to.cx;
      labelY = to.y + to.h + 17;
    } else if (edge.labelPlacement === "left-of-edge") {
      labelX -= labelWidth / 2 + LABEL_EDGE_GAP;
    } else if (edge.labelPlacement === "right-of-edge") {
      labelX += labelWidth / 2 + LABEL_EDGE_GAP;
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide,
      toSide,
      routePoints
    });
  }
  return edges;
}
function placeBandDecisions(diagram, nodes) {
  const decisions = (diagram.decisions ?? []).map((decision) => ({ ...decision }));
  if (decisions.length === 0) return [];
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const placed = [];
  for (const decision of decisions) {
    const source = nodeById[decision.source];
    if (!source) continue;
    const nextTarget = diagram.edges.filter((edge) => edge.from === decision.source).map((edge) => nodeById[edge.to]).filter((target) => Boolean(target) && target.band > source.band).sort((a, b) => a.band - b.band)[0];
    if (!nextTarget) continue;
    const availableWidth = nextTarget.x - (source.x + source.w);
    placed.push({
      ...decision,
      x: source.x + source.w + availableWidth / 2,
      y: source.cy,
      width: Math.min(labelPillWidth(decision.label), availableWidth)
    });
  }
  return placed;
}
function placeBandContinuations(diagram, nodes) {
  const continuations = (diagram.continuations ?? []).map((continuation) => ({ ...continuation }));
  if (continuations.length === 0) return [];
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const placed = [];
  for (const continuation of continuations) {
    const from = nodeById[continuation.from];
    if (!from) continue;
    const variant = continuation.variant ?? "branch";
    const anchor = continuation.anchor ?? "center";
    const sourceX = continuation.side === "left" ? from.x : from.x + from.w;
    const sourceY = anchor === "upper" ? from.y + CONTINUATION_PORT_INSET : anchor === "lower" ? from.y + from.h - CONTINUATION_PORT_INSET : isMutedNode(from) ? from.y + from.h : from.cy;
    const endX = sourceX + (continuation.side === "left" ? -CONTINUATION_LENGTH : CONTINUATION_LENGTH);
    const endY = sourceY;
    const displayLabel = `${continuation.label} \xB7 ${continuation.destination}`;
    const labelWidth = labelPillWidth(displayLabel);
    const labelX = continuation.side === "left" ? sourceX - CONTINUATION_LABEL_GAP - labelWidth / 2 : sourceX + CONTINUATION_LABEL_GAP + labelWidth / 2;
    const labelY = continuation.labelPlacement === "above-source" ? sourceY - CONTINUATION_LABEL_OFFSET : sourceY + CONTINUATION_LABEL_OFFSET;
    placed.push({
      ...continuation,
      variant,
      displayLabel,
      d: `M ${sourceX} ${sourceY} L ${endX} ${endY}`,
      sourceX,
      sourceY,
      endX,
      endY,
      labelX,
      labelY,
      labelWidth
    });
  }
  return placed;
}
function layoutBand(spec, _locale) {
  const bands = spec.bands.map((band, index) => ({
    title: band.title,
    index,
    x: BAND_X0 + index * BAND_PITCH
  }));
  const { height, midline } = canvasMetrics(spec);
  const nodes = [];
  for (const band of bands) {
    const members = spec.nodes.filter((node) => node.band === band.index);
    members.forEach((node, slot) => {
      const h = nodeHeight(node);
      const cy = midline + (slot - (members.length - 1) / 2) * SLOT_PITCH + (node.nudge ?? 0);
      nodes.push({
        ...node,
        slot,
        w: CARD_W,
        h,
        x: band.x,
        y: cy - h / 2,
        cx: band.x + CARD_W / 2,
        cy
      });
    });
  }
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const edges = placeBandEdges(spec, nodes);
  const decisions = placeBandDecisions(spec, nodes);
  const continuations = placeBandContinuations(spec, nodes);
  const gridWidth = BAND_X0 * 2 + Math.max(0, bands.length - 1) * BAND_PITCH + CARD_W;
  const continuationExtent = Math.max(
    0,
    ...continuations.map((continuation) => continuation.labelX + continuation.labelWidth / 2 + 24),
    ...continuations.map((continuation) => continuation.endX + 12)
  );
  const width = Math.max(gridWidth, continuationExtent);
  return {
    width,
    height,
    nodes,
    edges,
    decisions,
    continuations,
    nodeById
  };
}

// src/layouts/flowchart.ts
var MARGIN_X = 72;
var BOTTOM_PAD = 64;
var OUTER_LANE_GAP = 56;
var OUTER_LANE_STEP = 26;
function topologicalLevels(nodes, edges) {
  const indegree = /* @__PURE__ */ new Map();
  const out = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    indegree.set(node.id, 0);
    out.set(node.id, []);
  }
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    const targets = out.get(edge.from);
    if (targets) targets.push(edge.to);
    else out.set(edge.from, [edge.to]);
  }
  const level = /* @__PURE__ */ new Map();
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0);
  let assigned = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    const currentLevel = level.get(current.id) ?? 0;
    assigned += 1;
    for (const target of out.get(current.id) ?? []) {
      const next = indegree.get(target) ?? 0;
      indegree.set(target, next - 1);
      const existing = level.get(target);
      if (existing === void 0 || currentLevel + 1 > existing) {
        level.set(target, currentLevel + 1);
      }
      if (next - 1 === 0) queue.push({ id: target });
    }
  }
  if (assigned < nodes.length) {
    const seen = new Set(level.keys());
    let fallback = 0;
    for (const node of nodes) {
      if (!seen.has(node.id)) level.set(node.id, fallback++);
    }
  }
  return level;
}
function layoutFlowchart(spec) {
  const { forward, back } = splitBackEdges(spec.nodes, spec.edges);
  const levelOf = spec.level !== void 0 ? new Map(spec.nodes.map((node) => [node.id, spec.level])) : topologicalLevels(spec.nodes, forward);
  const direction = spec.direction ?? "top-down";
  const horizontal = direction === "left-right";
  const levels = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const level = levelOf.get(node.id) ?? 0;
    const members = levels.get(level) ?? [];
    members.push({
      ...node,
      band: level,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0
    });
    levels.set(level, members);
  }
  const levelIndices = [...levels.keys()].sort((a, b) => a - b);
  const skipEdges = forward.filter(
    (edge) => Math.abs((levelOf.get(edge.to) ?? 0) - (levelOf.get(edge.from) ?? 0)) > 1
  );
  const nearLaneSpan = back.length > 0 ? OUTER_LANE_GAP + (back.length - 1) * OUTER_LANE_STEP : 0;
  const farLaneSpan = skipEdges.length > 0 ? OUTER_LANE_GAP + (skipEdges.length - 1) * OUTER_LANE_STEP : 0;
  const nodes = [];
  const nodeById = {};
  if (!horizontal) {
    const rowWidth = (members) => members.length * CARD_W + (members.length - 1) * FLOW_GAP_X;
    const contentW = Math.max(CARD_W, ...levelIndices.map((index) => rowWidth(levels.get(index) ?? [])));
    const originX = MARGIN_X + nearLaneSpan;
    const width2 = originX + contentW + farLaneSpan + MARGIN_X;
    let y = CONTENT_TOP;
    for (const index of levelIndices) {
      const members = levels.get(index) ?? [];
      const rowH = Math.max(...members.map((member) => member.h));
      const totalW = rowWidth(members);
      members.forEach((member, position) => {
        const x2 = originX + (contentW - totalW) / 2 + position * (CARD_W + FLOW_GAP_X);
        const cy = y + rowH / 2 + (member.nudge ?? 0);
        const placed = {
          ...member,
          x: x2,
          y: cy - member.h / 2,
          cx: x2 + CARD_W / 2,
          cy
        };
        nodes.push(placed);
        nodeById[placed.id] = placed;
      });
      y += rowH + FLOW_GAP_Y;
    }
    const height2 = y - FLOW_GAP_Y + BOTTOM_PAD;
    const edges2 = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
      horizontal: false,
      nearLaneX: originX - OUTER_LANE_GAP,
      farLaneX: originX + contentW + OUTER_LANE_GAP
    });
    return { width: width2, height: height2, nodes, edges: edges2, decisions: [], continuations: [], nodeById };
  }
  const columnHeight = (members) => members.reduce((sum, member) => sum + member.h, 0) + (members.length - 1) * FLOW_GAP_Y;
  const contentH = Math.max(
    CARD_W / 2,
    ...levelIndices.map((index) => columnHeight(levels.get(index) ?? []))
  );
  const originY = CONTENT_TOP + nearLaneSpan;
  const height = originY + contentH + farLaneSpan + BOTTOM_PAD;
  let x = MARGIN_X;
  for (const index of levelIndices) {
    const members = levels.get(index) ?? [];
    const totalH = columnHeight(members);
    let memberY = originY + (contentH - totalH) / 2;
    for (const member of members) {
      const cy = memberY + member.h / 2 + (member.nudge ?? 0);
      const placed = {
        ...member,
        x,
        y: cy - member.h / 2,
        cx: x + CARD_W / 2,
        cy
      };
      nodes.push(placed);
      nodeById[placed.id] = placed;
      memberY += member.h + FLOW_GAP_Y;
    }
    x += CARD_W + FLOW_GAP_X;
  }
  const width = x - FLOW_GAP_X + MARGIN_X;
  const edges = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
    horizontal: true,
    nearLaneX: originY - OUTER_LANE_GAP,
    farLaneX: originY + contentH + OUTER_LANE_GAP
  });
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}
function placeFlowEdges(spec, nodes, nodeById, levelOf, back, lanes) {
  const backSet = new Set(back);
  const edges = [];
  let nearLaneUsed = 0;
  let farLaneUsed = 0;
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    const levelDelta = (levelOf.get(to.id) ?? 0) - (levelOf.get(from.id) ?? 0);
    const isBack = backSet.has(edge);
    let placed;
    if (isBack) {
      const laneOffset = nearLaneUsed++ * -26;
      placed = lanes.horizontal ? outerLaneHorizontal(from, to, lanes.nearLaneX + laneOffset, "near") : outerLaneVertical(from, to, lanes.nearLaneX + laneOffset, "near");
    } else if (Math.abs(levelDelta) > 1) {
      const laneOffset = farLaneUsed++ * 26;
      placed = lanes.horizontal ? outerLaneHorizontal(from, to, lanes.farLaneX + laneOffset, "far") : outerLaneVertical(from, to, lanes.farLaneX + laneOffset, "far");
    } else if (levelDelta === 0) {
      const rightward = to.cx > from.cx || !lanes.horizontal && to.cy > from.cy;
      if (lanes.horizontal) {
        const movingDown = to.cy > from.cy;
        const startY = movingDown ? from.y + from.h : from.y;
        const endY = movingDown ? to.y : to.y + to.h;
        const controlY = (startY + endY) / 2;
        placed = {
          d: `M ${from.cx} ${startY} C ${from.cx} ${controlY}, ${to.cx} ${controlY}, ${to.cx} ${endY}`,
          labelX: (from.cx + to.cx) / 2,
          labelY: (startY + endY) / 2,
          startX: from.cx,
          startY,
          endX: to.cx,
          endY,
          fromSide: movingDown ? "bottom" : "top",
          toSide: movingDown ? "top" : "bottom"
        };
      } else {
        const startX = rightward ? from.x + from.w : from.x;
        const endX = rightward ? to.x : to.x + to.w;
        const controlX = (startX + endX) / 2;
        placed = {
          d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
          labelX: (startX + endX) / 2,
          labelY: (from.cy + to.cy) / 2,
          startX,
          startY: from.cy,
          endX,
          endY: to.cy,
          fromSide: rightward ? "right" : "left",
          toSide: rightward ? "left" : "right"
        };
      }
    } else if (lanes.horizontal) {
      const startX = from.x + from.w;
      const endX = to.x;
      const controlX = (startX + endX) / 2;
      placed = {
        d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
        labelX: (startX + endX) / 2,
        labelY: (from.cy + to.cy) / 2,
        startX,
        startY: from.cy,
        endX,
        endY: to.cy,
        fromSide: "right",
        toSide: "left"
      };
    } else {
      const startY = from.y + from.h;
      const endY = to.y;
      const controlY = Math.abs(endY - startY) * 0.5;
      placed = {
        d: `M ${from.cx} ${startY} C ${from.cx} ${startY + controlY}, ${to.cx} ${endY - controlY}, ${to.cx} ${endY}`,
        labelX: (from.cx + to.cx) / 2,
        labelY: (startY + endY) / 2,
        startX: from.cx,
        startY,
        endX: to.cx,
        endY,
        fromSide: "bottom",
        toSide: "top"
      };
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      labelWidth,
      arrowEnd: isBack || Math.abs(levelDelta) > 1 ? true : void 0,
      ...placed
    });
  }
  return edges;
}
function outerLaneVertical(from, to, laneX, side) {
  const left = side === "near";
  const startX = left ? from.x : from.x + from.w;
  const endX = left ? to.x : to.x + to.w;
  const startY = connectY(from, left ? "left" : "right");
  const endY = connectY(to, left ? "left" : "right");
  return laneShape(
    [
      [startX, startY],
      [laneX, startY],
      [laneX, endY],
      [endX, endY]
    ],
    left ? "left" : "right",
    left ? "left" : "right",
    laneX,
    (startY + endY) / 2
  );
}
function outerLaneHorizontal(from, to, laneY, side) {
  const top = side === "near";
  const startY = top ? from.y : from.y + from.h;
  const endY = top ? to.y : to.y + to.h;
  return laneShape(
    [
      [from.cx, startY],
      [from.cx, laneY],
      [to.cx, laneY],
      [to.cx, endY]
    ],
    top ? "top" : "bottom",
    top ? "top" : "bottom",
    (from.cx + to.cx) / 2,
    laneY
  );
}
function laneShape(points, fromSide, toSide, labelX, labelY) {
  const [startX, startY] = points[0];
  const [endX, endY] = points[points.length - 1];
  return {
    d: roundedPolyline(points, LANE_R),
    labelX,
    labelY,
    startX,
    startY,
    endX,
    endY,
    fromSide,
    toSide,
    routePoints: points
  };
}

// src/layouts/sequence.ts
var PARTICIPANT_PITCH = 300;
var HEADER_W = 200;
var HEADER_H = CARD_H_SLIM;
var HEADER_TOP = 8;
var MARGIN_X2 = 72;
var BOTTOM_PAD2 = 48;
var ACTIVATION_W = 8;
var END_TRIM = 5;
function layoutSequence(spec) {
  const count = Math.max(1, spec.participants.length);
  const width = 2 * (MARGIN_X2 + HEADER_W / 2) + PARTICIPANT_PITCH * (count - 1);
  const headerBottom = HEADER_TOP + HEADER_H;
  const messageTop = headerBottom + 48;
  const y1 = messageTop + spec.messages.length * MESSAGE_PITCH;
  const height = y1 + BOTTOM_PAD2;
  const lifelines = [];
  const nodes = [];
  const nodeById = {};
  spec.participants.forEach((participant, index) => {
    const cx = MARGIN_X2 + HEADER_W / 2 + PARTICIPANT_PITCH * index;
    lifelines.push({
      id: participant.id,
      label: participant.label,
      kind: participant.kind,
      x: cx,
      y0: headerBottom,
      y1
    });
    const header = {
      id: participant.id,
      label: participant.label,
      description: participant.kind ? `${participant.kind}: ${participant.label}` : participant.label,
      kind: participant.kind,
      band: 0,
      w: HEADER_W,
      h: HEADER_H,
      x: cx - HEADER_W / 2,
      y: HEADER_TOP,
      cx,
      cy: HEADER_TOP + HEADER_H / 2,
      shape: "card"
    };
    nodes.push(header);
    nodeById[header.id] = header;
  });
  const messageY = (index) => messageTop + index * MESSAGE_PITCH + MESSAGE_PITCH / 2;
  const edges = [];
  spec.messages.forEach((message, index) => {
    const from = nodeById[message.from];
    const to = nodeById[message.to];
    if (!from || !to) return;
    const y = messageY(index);
    const variant = message.variant ?? "main";
    const labelWidth = message.label ? labelPillWidth(message.label) : 0;
    if (message.from === message.to) {
      const startX2 = from.cx + END_TRIM;
      const endX2 = from.cx + END_TRIM;
      edges.push({
        ...message,
        id: edgeId(message),
        variant,
        d: `M ${startX2} ${y - 10} C ${startX2 + 84} ${y - 12}, ${startX2 + 84} ${y + 12}, ${endX2} ${y + 10}`,
        labelX: from.cx + 104 + labelWidth / 2,
        labelY: y,
        labelWidth,
        startX: startX2,
        startY: y,
        endX: endX2,
        endY: y,
        fromSide: "right",
        toSide: "right",
        arrowEnd: true
      });
      return;
    }
    const rightward = to.cx > from.cx;
    const startX = from.cx + (rightward ? END_TRIM : -END_TRIM);
    const endX = to.cx - (rightward ? END_TRIM : -END_TRIM);
    edges.push({
      ...message,
      id: edgeId(message),
      variant,
      d: `M ${startX} ${y} L ${endX} ${y}`,
      labelX: (startX + endX) / 2,
      labelY: y - 14,
      labelWidth,
      startX,
      startY: y,
      endX,
      endY: y,
      fromSide: rightward ? "right" : "left",
      toSide: rightward ? "left" : "right",
      arrowEnd: true
    });
  });
  spec.messages.forEach((message, index) => {
    if (!message.activation) return;
    const receiver = nodeById[message.to];
    if (!receiver) return;
    const opensAt = messageY(index);
    const reply = spec.messages.findIndex(
      (candidate, candidateIndex) => candidateIndex > index && candidate.from === message.to
    );
    const closesAt = reply >= 0 ? messageY(reply) : opensAt + MESSAGE_PITCH * 0.72;
    const bar = {
      id: `activation-${message.id}`,
      label: "",
      description: "",
      band: 0,
      w: ACTIVATION_W,
      h: closesAt - opensAt + 8,
      x: receiver.cx - ACTIVATION_W / 2,
      y: opensAt - 4,
      cx: receiver.cx,
      cy: (opensAt + closesAt) / 2,
      shape: "bar",
      weight: (message.variant ?? "main") === "branch" ? "secondary" : "primary"
    };
    nodes.push(bar);
    nodeById[bar.id] = bar;
  });
  return { width, height, nodes, edges, decisions: [], continuations: [], lifelines, nodeById };
}

// src/layouts/state-machine.ts
var STATE_W = 220;
var MARGIN_X3 = 96;
var MARGIN_Y = 64;
var TRIM_GAP = 6;
function borderPoint(node, tx, ty) {
  const dx = tx - node.cx;
  const dy = ty - node.cy;
  if (dx === 0 && dy === 0) return [node.cx, node.cy];
  const scale = 1 / Math.max(Math.abs(dx) / (node.w / 2 + TRIM_GAP), Math.abs(dy) / (node.h / 2 + TRIM_GAP));
  return [node.cx + dx * scale, node.cy + dy * scale];
}
function layoutStateMachine(spec) {
  const states = spec.states.map((state) => ({ ...state }));
  const n = Math.max(1, states.length);
  const ringRadius = n * (STATE_W + 64) / (2 * Math.PI);
  const rx = Math.max(340, ringRadius * 1.7);
  const ry = Math.max(180, ringRadius * 0.88);
  const width = Math.round(2 * (rx + STATE_W / 2 + MARGIN_X3));
  const height = Math.round(2 * (ry + 44 + MARGIN_Y));
  const centreX = width / 2;
  const centreY = height / 2;
  const nodes = [];
  const nodeById = {};
  states.forEach((state, index) => {
    const angle = index / n * Math.PI * 2 - Math.PI / 2;
    const h = nodeHeight(state);
    const w = state.sublabel ? CARD_W : STATE_W;
    const x = centreX + Math.cos(angle) * rx - w / 2;
    const y = centreY + Math.sin(angle) * ry - h / 2;
    const placed = {
      ...state,
      description: state.description ?? `${state.kind ? `${state.kind}: ` : ""}${state.label}`,
      band: 0,
      w,
      h,
      x,
      y,
      cx: x + w / 2,
      cy: y + h / 2,
      shape: "state"
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const angleOf = /* @__PURE__ */ new Map();
  states.forEach((state, index) => {
    angleOf.set(state.id, index / n * Math.PI * 2 - Math.PI / 2);
  });
  const ringStep = Math.PI * 2 / n;
  const edges = [];
  for (const transition of spec.transitions) {
    const from = nodeById[transition.from];
    const to = nodeById[transition.to];
    if (!from || !to) continue;
    const variant = transition.variant ?? "main";
    const labelWidth = transition.label ? labelPillWidth(transition.label) : 0;
    if (transition.from === transition.to) {
      const startX2 = from.x + from.w * 0.35;
      const endX2 = from.x + from.w * 0.65;
      const loopY = from.y - 36;
      edges.push({
        ...transition,
        id: `${transition.from}::self::${from.id}`,
        variant,
        d: `M ${startX2} ${from.y} C ${startX2} ${loopY - 14}, ${endX2} ${loopY - 14}, ${endX2} ${from.y}`,
        labelX: from.cx,
        labelY: loopY - 24,
        labelWidth,
        startX: startX2,
        startY: from.y,
        endX: endX2,
        endY: from.y,
        fromSide: "top",
        toSide: "top",
        arrowEnd: true
      });
      continue;
    }
    const a = angleOf.get(from.id) ?? 0;
    const b = angleOf.get(to.id) ?? 0;
    let delta = Math.abs(b - a);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    const isNeighbour = delta <= ringStep * 1.05;
    const midX = (from.cx + to.cx) / 2;
    const midY = (from.cy + to.cy) / 2;
    const outX = midX - centreX;
    const outY = midY - centreY;
    const outLen = Math.hypot(outX, outY) || 1;
    const bow = isNeighbour ? 72 : -Math.min(64, outLen * 0.22);
    const controlX = midX + outX / outLen * bow;
    const controlY = midY + outY / outLen * bow;
    const [startX, startY] = borderPoint(from, controlX, controlY);
    const [endX, endY] = borderPoint(to, controlX, controlY);
    const labelX = 0.25 * startX + 0.5 * controlX + 0.25 * endX;
    const labelY = 0.25 * startY + 0.5 * controlY + 0.25 * endY;
    edges.push({
      ...transition,
      id: edgeId(transition),
      variant,
      d: `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? endX > startX ? "right" : "left" : endY > startY ? "bottom" : "top",
      toSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? endX > startX ? "left" : "right" : endY > startY ? "top" : "bottom",
      arrowEnd: true
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/er.ts
var TABLE_W = 240;
var HEADER_H2 = 26;
var ROW_H = 22;
var FOOT_PAD = 10;
var GRID_GAP_X = 112;
var GRID_GAP_Y = 88;
var MARGIN_X4 = 72;
var MARGIN_TOP = 64;
var BOTTOM_PAD3 = 64;
var COLS = 3;
var tableHeight = (fields) => HEADER_H2 + fields.length * ROW_H + FOOT_PAD;
function layoutEr(spec) {
  const cols = Math.min(COLS, Math.max(1, spec.entities.length));
  const rows = Math.ceil(spec.entities.length / cols);
  const rowHeights = [];
  for (let row = 0; row < rows; row += 1) {
    const members = spec.entities.slice(row * cols, row * cols + cols);
    rowHeights.push(Math.max(...members.map((entity) => tableHeight(entity.fields))));
  }
  const rowTops = [];
  let cursorY = MARGIN_TOP;
  for (let row = 0; row < rows; row += 1) {
    rowTops.push(cursorY);
    cursorY += rowHeights[row] + GRID_GAP_Y;
  }
  const height = cursorY - GRID_GAP_Y + BOTTOM_PAD3;
  const usedCols = Math.min(cols, spec.entities.length);
  const width = MARGIN_X4 * 2 + usedCols * TABLE_W + (usedCols - 1) * GRID_GAP_X;
  const xFor = (col) => MARGIN_X4 + col * (TABLE_W + GRID_GAP_X);
  const nodes = [];
  const nodeById = {};
  const colOf = /* @__PURE__ */ new Map();
  const rowOf = /* @__PURE__ */ new Map();
  spec.entities.forEach((entity, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const h = tableHeight(entity.fields);
    const x = xFor(col);
    const y = rowTops[row];
    colOf.set(entity.id, col);
    rowOf.set(entity.id, row);
    const placed = {
      id: entity.id,
      label: entity.label,
      description: entity.kind ? `${entity.kind}: ${entity.label}` : entity.label,
      kind: entity.kind,
      weight: entity.weight,
      fields: entity.fields,
      band: row,
      w: TABLE_W,
      h,
      x,
      y,
      cx: x + TABLE_W / 2,
      cy: y + h / 2,
      shape: "table"
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const anchorY = (node) => node.y + HEADER_H2 / 2;
  const edges = [];
  for (const relation of spec.relations) {
    const from = nodeById[relation.from];
    const to = nodeById[relation.to];
    if (!from || !to) continue;
    const variant = relation.variant ?? "main";
    const labelWidth = relation.label ? labelPillWidth(relation.label) : 0;
    const fromCol = colOf.get(relation.from) ?? 0;
    const toCol = colOf.get(relation.to) ?? 0;
    const fromRow = rowOf.get(relation.from) ?? 0;
    const toRow = rowOf.get(relation.to) ?? 0;
    let d;
    let labelX;
    let labelY;
    let startX;
    let startY;
    let endX;
    let endY;
    let fromSide;
    let toSide;
    let routePoints;
    if (fromRow === toRow && Math.abs(fromCol - toCol) === 1) {
      const rightward = toCol > fromCol;
      startX = rightward ? from.x + from.w : from.x;
      endX = rightward ? to.x : to.x + to.w;
      startY = anchorY(from);
      endY = anchorY(to);
      const controlX = (startX + endX) / 2;
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
    } else if (fromRow === toRow) {
      const rightward = toCol > fromCol;
      startX = rightward ? from.x + from.w : from.x;
      endX = rightward ? to.x : to.x + to.w;
      startY = anchorY(from);
      endY = anchorY(to);
      const corridorY = rowTops[fromRow] + rowHeights[fromRow] + GRID_GAP_Y / 2;
      const gapA = rightward ? from.x + from.w + GRID_GAP_X / 2 : from.x - GRID_GAP_X / 2;
      const gapB = rightward ? to.x - GRID_GAP_X / 2 : to.x + to.w + GRID_GAP_X / 2;
      routePoints = [
        [startX, startY],
        [gapA, startY],
        [gapA, corridorY],
        [gapB, corridorY],
        [gapB, endY],
        [endX, endY]
      ];
      d = roundedPolyline(routePoints, LANE_R);
      labelX = (gapA + gapB) / 2;
      labelY = corridorY;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
    } else if (fromCol === toCol) {
      const movingDown = toRow > fromRow;
      startX = from.cx;
      endX = to.cx;
      startY = movingDown ? from.y + from.h : from.y;
      endY = movingDown ? to.y : to.y + to.h;
      const controlY = Math.abs(endY - startY) * 0.5;
      d = movingDown ? `M ${startX} ${startY} C ${startX} ${startY + controlY}, ${endX} ${endY - controlY}, ${endX} ${endY}` : `M ${startX} ${startY} C ${startX} ${startY - controlY}, ${endX} ${endY + controlY}, ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2;
      fromSide = movingDown ? "bottom" : "top";
      toSide = movingDown ? "top" : "bottom";
    } else {
      const movingDown = toRow > fromRow;
      const rightward = toCol > fromCol;
      startX = from.cx;
      startY = movingDown ? from.y + from.h : from.y;
      endX = rightward ? to.x : to.x + to.w;
      endY = anchorY(to);
      const corridorRow = movingDown ? fromRow : toRow;
      const corridorY = rowTops[corridorRow] + rowHeights[corridorRow] + GRID_GAP_Y / 2;
      routePoints = [
        [startX, startY],
        [startX, corridorY],
        [rightward ? to.x - GRID_GAP_X / 2 : to.x + to.w + GRID_GAP_X / 2, corridorY],
        [rightward ? to.x - GRID_GAP_X / 2 : to.x + to.w + GRID_GAP_X / 2, endY],
        [endX, endY]
      ];
      d = roundedPolyline(routePoints, LANE_R);
      labelX = (startX + routePoints[2][0]) / 2;
      labelY = corridorY;
      fromSide = movingDown ? "bottom" : "top";
      toSide = rightward ? "left" : "right";
    }
    edges.push({
      ...relation,
      id: edgeId(relation),
      variant,
      d,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide,
      toSide,
      routePoints
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/timeline.ts
var MARGIN_X5 = 96;
var TOP_PAD = 56;
var BOTTOM_PAD4 = 64;
var EVENT_W = 240;
var SPINE_OVERHANG = 72;
function layoutTimeline(spec) {
  const n = Math.max(1, spec.events.length);
  const edgePad = MARGIN_X5 + EVENT_W / 2;
  const width = edgePad * 2 + TIMELINE_EVENT_GAP * (n - 1);
  const spineY = TOP_PAD + TIMELINE_ALT_OFFSET + 40;
  const height = spineY + TIMELINE_ALT_OFFSET + 40 + BOTTOM_PAD4;
  const nodes = [];
  const nodeById = {};
  spec.events.forEach((event, index) => {
    const above = index % 2 === 0;
    const x = edgePad + TIMELINE_EVENT_GAP * index;
    const labelY = above ? spineY - TIMELINE_ALT_OFFSET - 8 : spineY + TIMELINE_ALT_OFFSET + 8;
    const placed = {
      id: event.id,
      label: event.label,
      description: event.description,
      kind: event.kind,
      sublabel: event.sublabel,
      weight: event.weight ?? (event.variant === "branch" ? "secondary" : "primary"),
      band: 0,
      w: EVENT_W,
      h: 0,
      x: x - EVENT_W / 2,
      y: labelY,
      cx: x,
      cy: spineY,
      shape: "event",
      textAnchor: "middle",
      nudge: above ? -1 : 1
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const firstX = edgePad - SPINE_OVERHANG;
  const lastX = edgePad + TIMELINE_EVENT_GAP * (n - 1) + SPINE_OVERHANG;
  const edges = [];
  const spine = {
    id: "timeline-spine",
    from: "",
    to: "",
    variant: "main",
    dashed: true,
    d: `M ${firstX} ${spineY} L ${lastX} ${spineY}`,
    labelX: 0,
    labelY: 0,
    labelWidth: 0,
    startX: firstX,
    startY: spineY,
    endX: lastX,
    endY: spineY,
    fromSide: "left",
    toSide: "right",
    arrowEnd: true,
    strokeWidth: 1.1
  };
  edges.push(spine);
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/swimlane.ts
var TOP_PAD2 = 56;
var BOTTOM_PAD5 = 56;
var NODE_GAP = 96;
var STACK_GAP = 24;
function layoutSwimlane(spec) {
  const laneIds = spec.lanes.map((lane) => lane.id);
  const { forward } = splitBackEdges(spec.nodes, spec.edges);
  const columnOf = topologicalLevels(spec.nodes, forward);
  const maxColumn = Math.max(0, ...columnOf.values());
  const xForColumn = (column) => SWIMLANE_HEADER_W + SWIMLANE_PAD + column * (CARD_W + NODE_GAP);
  const width = xForColumn(maxColumn) + CARD_W + SWIMLANE_PAD * 2;
  const byLane = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const column = columnOf.get(node.id) ?? 0;
    const laneColumns = byLane.get(node.lane) ?? /* @__PURE__ */ new Map();
    const cell = laneColumns.get(column) ?? [];
    cell.push({
      ...node,
      band: 0,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0
    });
    laneColumns.set(column, cell);
    byLane.set(node.lane, laneColumns);
  }
  const laneHeights = laneIds.map((id) => {
    const laneColumns = byLane.get(id);
    if (!laneColumns) return 88;
    let tallest = 0;
    for (const cell of laneColumns.values()) {
      const stackH = cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP;
      tallest = Math.max(tallest, stackH);
    }
    return Math.max(88, tallest + SWIMLANE_ROW_PAD);
  });
  let cursorY = TOP_PAD2;
  const laneTop = /* @__PURE__ */ new Map();
  laneIds.forEach((id, index) => {
    laneTop.set(id, cursorY);
    cursorY += laneHeights[index];
  });
  const height = cursorY + BOTTOM_PAD5;
  const containers = [];
  spec.lanes.forEach((lane, index) => {
    containers.push({
      id: lane.id,
      label: lane.label,
      kind: lane.kind,
      x: 0,
      y: laneTop.get(lane.id) ?? 0,
      w: width,
      h: laneHeights[index]
    });
  });
  const nodes = [];
  const nodeById = {};
  laneIds.forEach((laneId, laneIndex) => {
    const laneColumns = byLane.get(laneId);
    if (!laneColumns) return;
    const top = laneTop.get(laneId) ?? 0;
    const laneH = laneHeights[laneIndex];
    for (const [column, cell] of laneColumns) {
      const x = xForColumn(column);
      const stackH = cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP;
      let memberY = top + (laneH - stackH) / 2;
      for (const member of cell) {
        const cy = memberY + member.h / 2 + (member.nudge ?? 0);
        const placed = {
          ...member,
          band: laneIndex,
          x,
          y: cy - member.h / 2,
          cx: x + member.w / 2,
          cy
        };
        nodes.push(placed);
        nodeById[placed.id] = placed;
        memberY += member.h + STACK_GAP;
      }
    }
  });
  const edges = [];
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    const sameLane = from.band === to.band;
    const sameColumn = (columnOf.get(edge.from) ?? 0) === (columnOf.get(edge.to) ?? 0);
    const crossesLane = !sameLane;
    let d;
    let startX;
    let startY;
    let endX;
    let endY;
    let fromSide;
    let toSide;
    if (sameColumn && crossesLane) {
      const movingDown = to.cy > from.cy;
      startX = from.cx;
      startY = movingDown ? from.y + from.h : from.y;
      endX = to.cx;
      endY = movingDown ? to.y : to.y + to.h;
      const controlY = (startY + endY) / 2;
      d = `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
      fromSide = movingDown ? "bottom" : "top";
      toSide = movingDown ? "top" : "bottom";
    } else {
      const rightward = to.cx > from.cx;
      startX = rightward ? from.x + from.w : from.x;
      startY = from.cy;
      endX = rightward ? to.x : to.x + to.w;
      endY = to.cy;
      const controlX = (startX + endX) / 2;
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide,
      toSide,
      arrowEnd: crossesLane ? true : void 0
    });
  }
  return {
    width,
    height,
    nodes,
    edges,
    decisions: [],
    continuations: [],
    containers,
    nodeById
  };
}

// src/layouts/index.ts
function layoutByType(spec) {
  const type = "type" in spec ? spec.type : "band";
  switch (type) {
    case "band":
      return layoutBand(spec);
    case "flowchart":
      return layoutFlowchart(spec);
    case "sequence":
      return layoutSequence(spec);
    case "state-machine":
      return layoutStateMachine(spec);
    case "er":
      return layoutEr(spec);
    case "timeline":
      return layoutTimeline(spec);
    case "swimlane":
      return layoutSwimlane(spec);
    default:
      return layoutBand(spec);
  }
}
function layoutDiagram(spec) {
  return layoutByType(spec);
}

// src/canvas/DiagramCanvas.tsx
import { useState } from "react";

// src/canvas/ArchitectureNodeIcon.tsx
import {
  ArrowsSplit,
  BracketsCurly,
  FolderLock,
  Gauge,
  Graph,
  Handshake,
  ListChecks,
  ListMagnifyingGlass,
  Monitor,
  Receipt,
  RocketLaunch,
  Scales,
  SealCheck,
  UserCheck,
  UserFocus,
  Warning
} from "@phosphor-icons/react";

// src/svgs/expressjs.tsx
import { jsx } from "react/jsx-runtime";
var Expressjs = (props) => /* @__PURE__ */ jsx("svg", { ...props, viewBox: "0 0 32 32", children: /* @__PURE__ */ jsx("path", { d: "M32 24.795c-1.164.296-1.884.013-2.53-.957l-4.594-6.356-.664-.88-5.365 7.257c-.613.873-1.256 1.253-2.4.944l6.87-9.222-6.396-8.33c1.1-.214 1.86-.105 2.535.88l4.765 6.435 4.8-6.4c.615-.873 1.276-1.205 2.38-.883l-2.48 3.288-3.36 4.375c-.4.5-.345.842.023 1.325L32 24.795zM.008 15.427l.562-2.764C2.1 7.193 8.37 4.92 12.694 8.3c2.527 1.988 3.155 4.8 3.03 7.95H1.48c-.214 5.67 3.867 9.092 9.07 7.346 1.825-.613 2.9-2.042 3.438-3.83.273-.896.725-1.036 1.567-.78-.43 2.236-1.4 4.104-3.45 5.273-3.063 1.75-7.435 1.184-9.735-1.248C1 21.6.434 19.812.18 17.9c-.04-.316-.12-.617-.18-.92q.008-.776.008-1.552zm1.498-.38h12.872c-.084-4.1-2.637-7.012-6.126-7.037-3.83-.03-6.58 2.813-6.746 7.037z" }) });

// src/svgs/expressjsDark.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var ExpressjsDark = (props) => /* @__PURE__ */ jsx2("svg", { ...props, viewBox: "0 0 32 32", children: /* @__PURE__ */ jsx2(
  "path",
  {
    fill: "#fff",
    d: "M32 24.795c-1.164.296-1.884.013-2.53-.957l-4.594-6.356-.664-.88-5.365 7.257c-.613.873-1.256 1.253-2.4.944l6.87-9.222-6.396-8.33c1.1-.214 1.86-.105 2.535.88l4.765 6.435 4.8-6.4c.615-.873 1.276-1.205 2.38-.883l-2.48 3.288-3.36 4.375c-.4.5-.345.842.023 1.325L32 24.795zM.008 15.427l.562-2.764C2.1 7.193 8.37 4.92 12.694 8.3c2.527 1.988 3.155 4.8 3.03 7.95H1.48c-.214 5.67 3.867 9.092 9.07 7.346 1.825-.613 2.9-2.042 3.438-3.83.273-.896.725-1.036 1.567-.78-.43 2.236-1.4 4.104-3.45 5.273-3.063 1.75-7.435 1.184-9.735-1.248C1 21.6.434 19.812.18 17.9c-.04-.316-.12-.617-.18-.92q.008-.776.008-1.552zm1.498-.38h12.872c-.084-4.1-2.637-7.012-6.126-7.037-3.83-.03-6.58 2.813-6.746 7.037z"
  }
) });

// src/svgs/googleCloud.tsx
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var GoogleCloud = (props) => /* @__PURE__ */ jsxs("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 -25 256 256", children: [
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#EA4335",
      d: "m170.252 56.819 22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-6.168l7.496.39Z"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#4285F4",
      d: "M224.205 73.918a100.249 100.249 0 0 0-30.217-48.722l-31.232 31.232a55.515 55.515 0 0 1 20.379 44.037v5.544c15.35 0 27.797 12.445 27.797 27.796 0 15.352-12.446 27.485-27.797 27.485h-55.671l-5.466 5.934v33.34l5.466 5.231h55.67c39.93.311 72.553-31.494 72.864-71.424a72.303 72.303 0 0 0-31.793-60.453"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#34A853",
      d: "M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 0 1-11.399-2.498l-7.887 2.42-22.409 22.253-1.952 7.574c12.567 9.489 27.9 14.825 43.647 14.757"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#FBBC05",
      d: "M71.87 61.425C31.94 61.664-.237 94.228.001 134.159a72.301 72.301 0 0 0 28.222 56.88l32.248-32.246c-13.99-6.322-20.208-22.786-13.887-36.776 6.32-13.99 22.786-20.208 36.775-13.888a27.796 27.796 0 0 1 13.887 13.888l32.248-32.248A72.224 72.224 0 0 0 71.87 61.425"
    }
  )
] });

// src/svgs/modelContextProtocolDark.tsx
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var ModelContextProtocolDark = (props) => /* @__PURE__ */ jsxs2(
  "svg",
  {
    ...props,
    fill: "#ffffff",
    fillRule: "evenodd",
    style: { flex: "none", lineHeight: "1" },
    viewBox: "0 0 24 24",
    children: [
      /* @__PURE__ */ jsx4("title", { children: "ModelContextProtocol" }),
      /* @__PURE__ */ jsx4("path", { d: "M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" }),
      /* @__PURE__ */ jsx4("path", { d: "M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" })
    ]
  }
);

// src/svgs/modelContextProtocolLight.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var ModelContextProtocolLight = (props) => /* @__PURE__ */ jsxs3(
  "svg",
  {
    ...props,
    fill: "#000000",
    fillRule: "evenodd",
    style: { flex: "none", lineHeight: "1" },
    viewBox: "0 0 24 24",
    children: [
      /* @__PURE__ */ jsx5("title", { children: "ModelContextProtocol" }),
      /* @__PURE__ */ jsx5("path", { d: "M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" }),
      /* @__PURE__ */ jsx5("path", { d: "M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" })
    ]
  }
);

// src/svgs/nextjsIconDark.tsx
import { useId } from "react";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var NextjsIconDark = (props) => {
  const id = useId();
  const maskId = `${id}-nextjs-mask`;
  const wordmarkGradientId = `${id}-nextjs-wordmark-gradient`;
  const stemGradientId = `${id}-nextjs-stem-gradient`;
  return /* @__PURE__ */ jsxs4("svg", { ...props, viewBox: "0 0 180 180", children: [
    /* @__PURE__ */ jsx6(
      "mask",
      {
        height: "180",
        id: maskId,
        maskUnits: "userSpaceOnUse",
        width: "180",
        x: "0",
        y: "0",
        style: { maskType: "alpha" },
        children: /* @__PURE__ */ jsx6("circle", { cx: "90", cy: "90", fill: "black", r: "90" })
      }
    ),
    /* @__PURE__ */ jsxs4("g", { mask: `url(#${maskId})`, children: [
      /* @__PURE__ */ jsx6("circle", { cx: "90", cy: "90", "data-circle": "true", fill: "black", r: "90" }),
      /* @__PURE__ */ jsx6(
        "path",
        {
          d: "M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z",
          fill: `url(#${wordmarkGradientId})`
        }
      ),
      /* @__PURE__ */ jsx6("rect", { fill: `url(#${stemGradientId})`, height: "72", width: "12", x: "115", y: "54" })
    ] }),
    /* @__PURE__ */ jsxs4("defs", { children: [
      /* @__PURE__ */ jsxs4(
        "linearGradient",
        {
          gradientUnits: "userSpaceOnUse",
          id: wordmarkGradientId,
          x1: "109",
          x2: "144.5",
          y1: "116.5",
          y2: "160.5",
          children: [
            /* @__PURE__ */ jsx6("stop", { stopColor: "white" }),
            /* @__PURE__ */ jsx6("stop", { offset: "1", stopColor: "white", stopOpacity: "0" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs4(
        "linearGradient",
        {
          gradientUnits: "userSpaceOnUse",
          id: stemGradientId,
          x1: "121",
          x2: "120.799",
          y1: "54",
          y2: "106.875",
          children: [
            /* @__PURE__ */ jsx6("stop", { stopColor: "white" }),
            /* @__PURE__ */ jsx6("stop", { offset: "1", stopColor: "white", stopOpacity: "0" })
          ]
        }
      )
    ] })
  ] });
};

// src/svgs/openai.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var Openai = (props) => /* @__PURE__ */ jsx7("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 0 256 260", children: /* @__PURE__ */ jsx7("path", { d: "M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" }) });

// src/svgs/openaiDark.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
var OpenaiDark = (props) => /* @__PURE__ */ jsx8("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 0 256 260", children: /* @__PURE__ */ jsx8(
  "path",
  {
    fill: "#fff",
    d: "M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
  }
) });

// src/svgs/openrouterDark.tsx
import { jsx as jsx9, jsxs as jsxs5 } from "react/jsx-runtime";
var OpenrouterDark = (props) => /* @__PURE__ */ jsx9("svg", { ...props, viewBox: "0 0 512 512", fill: "#ffff", stroke: "#ffff", children: /* @__PURE__ */ jsxs5("g", { clipPath: "url(#clip0_205_3)", children: [
  /* @__PURE__ */ jsx9(
    "path",
    {
      d: "M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx9("path", { d: "M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" }),
  /* @__PURE__ */ jsx9(
    "path",
    {
      d: "M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx9("path", { d: "M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" })
] }) });

// src/svgs/openrouterLight.tsx
import { jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
var OpenrouterLight = (props) => /* @__PURE__ */ jsx10("svg", { ...props, viewBox: "0 0 512 512", fill: "#111111", stroke: "#111111", children: /* @__PURE__ */ jsxs6("g", { clipPath: "url(#clip0_205_3)", children: [
  /* @__PURE__ */ jsx10(
    "path",
    {
      d: "M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx10("path", { d: "M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" }),
  /* @__PURE__ */ jsx10(
    "path",
    {
      d: "M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx10("path", { d: "M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" })
] }) });

// src/svgs/pdf.tsx
import { jsx as jsx11, jsxs as jsxs7 } from "react/jsx-runtime";
var Pdf = (props) => /* @__PURE__ */ jsxs7("svg", { ...props, viewBox: "0 0 75.32 92.604", children: [
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#ff2116",
      d: "M-29.633 123.947c-3.552 0-6.443 2.894-6.443 6.446v49.498c0 3.551 2.891 6.445 6.443 6.445h37.85c3.552 0 6.443-2.893 6.443-6.445v-40.702s.102-1.191-.416-2.351a6.516 6.516 0 0 0-1.275-1.844 1.058 1.058 0 0 0-.006-.008l-9.39-9.21a1.058 1.058 0 0 0-.016-.016s-.802-.764-1.99-1.274c-1.4-.6-2.842-.537-2.842-.537l.021-.002z",
      color: "#000",
      fontFamily: "sans-serif",
      overflow: "visible",
      paintOrder: "markers fill stroke",
      style: {
        lineHeight: "normal",
        fontVariantLigatures: "normal",
        fontVariantPosition: "normal",
        fontVariantCaps: "normal",
        fontVariantNumeric: "normal",
        fontVariantAlternates: "normal",
        fontFeatureSettings: "normal",
        textIndent: "0",
        textAlign: "start",
        textDecorationLine: "none",
        textDecorationStyle: "solid",
        textDecorationColor: "#000",
        textTransform: "none",
        textOrientation: "mixed",
        whiteSpace: "normal",
        isolation: "auto",
        mixBlendMode: "normal"
      },
      transform: "translate(53.548 -183.975) scale(1.4843)"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#f5f5f5",
      d: "M-29.633 126.064h28.38a1.058 1.058 0 0 0 .02 0s1.135.011 1.965.368a5.385 5.385 0 0 1 1.373.869l9.368 9.19s.564.595.838 1.208c.22.495.234 1.4.234 1.4a1.058 1.058 0 0 0-.002.046v40.746a4.294 4.294 0 0 1-4.326 4.328h-37.85a4.294 4.294 0 0 1-4.326-4.328v-49.498a4.294 4.294 0 0 1 4.326-4.328z",
      color: "#000",
      fontFamily: "sans-serif",
      overflow: "visible",
      paintOrder: "markers fill stroke",
      style: {
        lineHeight: "normal",
        fontVariantLigatures: "normal",
        fontVariantPosition: "normal",
        fontVariantCaps: "normal",
        fontVariantNumeric: "normal",
        fontVariantAlternates: "normal",
        fontFeatureSettings: "normal",
        textIndent: "0",
        textAlign: "start",
        textDecorationLine: "none",
        textDecorationStyle: "solid",
        textDecorationColor: "#000",
        textTransform: "none",
        textOrientation: "mixed",
        whiteSpace: "normal",
        isolation: "auto",
        mixBlendMode: "normal"
      },
      transform: "translate(53.548 -183.975) scale(1.4843)"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#ff2116",
      d: "M18.804 55.135c-2.162-2.162.177-5.133 6.526-8.288l3.994-1.985 1.557-3.405a134.054 134.054 0 0 0 2.838-6.79l1.283-3.386-.884-2.506c-1.087-3.08-1.474-7.71-.785-9.374.934-2.255 3.994-2.024 5.205.393.946 1.888.849 5.307-.272 9.618l-.92 3.534.81 1.375c.445.756 1.746 2.55 2.89 3.989l2.152 2.676 2.677-.35c8.503-1.11 11.416.777 11.416 3.48 0 3.413-6.677 3.695-12.284-.243-1.262-.886-2.128-1.767-2.128-1.767s-3.513.716-5.243 1.182c-1.785.48-2.675.782-5.29 1.665 0 0-.918 1.332-1.516 2.301-2.224 3.604-4.821 6.59-6.676 7.677-2.077 1.217-4.254 1.3-5.35.204zm3.393-1.212c1.216-.751 3.676-3.66 5.378-6.361l.69-1.093-3.14 1.578c-4.848 2.438-7.066 4.735-5.913 6.125.648.78 1.423.716 2.985-.25zm31.494-8.84c1.189-.833 1.016-2.51-.328-3.187-1.045-.527-1.888-.635-4.606-.595-1.67.114-4.354.45-4.81.553 0 0 1.476 1.02 2.13 1.394.872.498 2.99 1.422 4.537 1.895 1.526.467 2.409.418 3.077-.06zm-12.663-5.264c-.72-.756-1.943-2.334-2.719-3.507-1.014-1.33-1.523-2.27-1.523-2.27s-.741 2.386-1.35 3.82l-1.898 4.692-.55 1.065s2.925-.96 4.414-1.348c1.576-.412 4.776-1.041 4.776-1.041zm-4.081-16.365c.184-1.54.261-3.078-.233-3.853-1.373-1.5-3.03-.25-2.749 3.318.095 1.2.393 3.25.791 4.515l.725 2.299.51-1.732c.28-.952.71-2.998.956-4.547z"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#2c2c2c",
      d: "M-20.93 167.839h2.365q1.133 0 1.84.217.706.21 1.19.944.482.728.482 1.756 0 .945-.392 1.624-.392.678-1.056.98-.658.3-2.03.3h-.818v3.73h-1.581zm1.58 1.224v3.33h.785q1.05 0 1.448-.391.406-.392.406-1.274 0-.657-.266-1.063-.266-.413-.588-.504-.315-.098-1-.098zm5.508-1.224h2.148q1.56 0 2.49.552.938.553 1.414 1.645.483 1.091.483 2.42 0 1.4-.434 2.499-.427 1.091-1.316 1.763-.881.672-2.518.672h-2.267zm1.58 1.266v7.018h.659q1.378 0 2-.952.623-.958.623-2.553 0-3.513-2.623-3.513zm6.473-1.266h5.304v1.266h-3.723v2.855h2.981v1.266h-2.98v4.164H-5.79z",
      fontFamily: "Franklin Gothic Medium Cond",
      letterSpacing: "0",
      style: { lineHeight: "125%" },
      transform: "translate(53.548 -183.975) scale(1.4843)",
      wordSpacing: "4.26"
    }
  )
] });

// src/svgs/postgresql.tsx
import { jsx as jsx12, jsxs as jsxs8 } from "react/jsx-runtime";
var Postgresql = (props) => /* @__PURE__ */ jsx12("svg", { ...props, xmlSpace: "preserve", viewBox: "0 0 432.071 445.383", children: /* @__PURE__ */ jsxs8(
  "g",
  {
    style: {
      fillRule: "nonzero",
      clipRule: "nonzero",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "12.4651",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeMiterlimit: "4"
    },
    children: [
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M323.205 324.227c2.833-23.601 1.984-27.062 19.563-23.239l4.463.392c13.517.615 31.199-2.174 41.587-7 22.362-10.376 35.622-27.7 13.572-23.148-50.297 10.376-53.755-6.655-53.755-6.655 53.111-78.803 75.313-178.836 56.149-203.322-52.27-66.789-142.748-35.206-144.262-34.386l-.482.089c-9.938-2.062-21.06-3.294-33.554-3.496-22.761-.374-40.032 5.967-53.133 15.904 0 0-161.408-66.498-153.899 83.628 1.597 31.936 45.777 241.655 98.47 178.31 19.259-23.163 37.871-42.748 37.871-42.748 9.242 6.14 20.307 9.272 31.912 8.147l.897-.765c-.281 2.876-.157 5.689.359 9.019-13.572 15.167-9.584 17.83-36.723 23.416-27.457 5.659-11.326 15.734-.797 18.367 12.768 3.193 42.305 7.716 62.268-20.224l-.795 3.188c5.325 4.26 4.965 30.619 5.72 49.452.756 18.834 2.017 36.409 5.856 46.771 3.839 10.36 8.369 37.05 44.036 29.406 29.809-6.388 52.6-15.582 54.677-101.107",
          style: {
            fill: "#000",
            stroke: "#000",
            strokeWidth: "37.3953",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M402.395 271.23c-50.302 10.376-53.76-6.655-53.76-6.655 53.111-78.808 75.313-178.843 56.153-203.326-52.27-66.785-142.752-35.2-144.262-34.38l-.486.087c-9.938-2.063-21.06-3.292-33.56-3.496-22.761-.373-40.026 5.967-53.127 15.902 0 0-161.411-66.495-153.904 83.63 1.597 31.938 45.776 241.657 98.471 178.312 19.26-23.163 37.869-42.748 37.869-42.748 9.243 6.14 20.308 9.272 31.908 8.147l.901-.765c-.28 2.876-.152 5.689.361 9.019-13.575 15.167-9.586 17.83-36.723 23.416-27.459 5.659-11.328 15.734-.796 18.367 12.768 3.193 42.307 7.716 62.266-20.224l-.796 3.188c5.319 4.26 9.054 27.711 8.428 48.969-.626 21.259-1.044 35.854 3.147 47.254 4.191 11.4 8.368 37.05 44.042 29.406 29.809-6.388 45.256-22.942 47.405-50.555 1.525-19.631 4.976-16.729 5.194-34.28l2.768-8.309c3.192-26.611.507-35.196 18.872-31.203l4.463.392c13.517.615 31.208-2.174 41.591-7 22.358-10.376 35.618-27.7 13.573-23.148z",
          style: { fill: "#336791", stroke: "none" },
          stroke: "none"
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M215.866 286.484c-1.385 49.516.348 99.377 5.193 111.495 4.848 12.118 15.223 35.688 50.9 28.045 29.806-6.39 40.651-18.756 45.357-46.051 3.466-20.082 10.148-75.854 11.005-87.281M173.104 38.256S11.583-27.76 19.092 122.365c1.597 31.938 45.779 241.664 98.473 178.316 19.256-23.166 36.671-41.335 36.671-41.335M260.349 26.207c-5.591 1.753 89.848-34.889 144.087 34.417 19.159 24.484-3.043 124.519-56.153 203.329" }),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M348.282 263.953s3.461 17.036 53.764 6.653c22.04-4.552 8.776 12.774-13.577 23.155-18.345 8.514-59.474 10.696-60.146-1.069-1.729-30.355 21.647-21.133 19.96-28.739-1.525-6.85-11.979-13.573-18.894-30.338-6.037-14.633-82.796-126.849 21.287-110.183 3.813-.789-27.146-99.002-124.553-100.599-97.385-1.597-94.19 119.762-94.19 119.762",
          style: { strokeLinejoin: "bevel" }
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M188.604 274.334c-13.577 15.166-9.584 17.829-36.723 23.417-27.459 5.66-11.326 15.733-.797 18.365 12.768 3.195 42.307 7.718 62.266-20.229 6.078-8.509-.036-22.086-8.385-25.547-4.034-1.671-9.428-3.765-16.361 3.994z" }),
      /* @__PURE__ */ jsx12("path", { d: "M187.715 274.069c-1.368-8.917 2.93-19.528 7.536-31.942 6.922-18.626 22.893-37.255 10.117-96.339-9.523-44.029-73.396-9.163-73.436-3.193-.039 5.968 2.889 30.26-1.067 58.548-5.162 36.913 23.488 68.132 56.479 64.938" }),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M172.517 141.7c-.288 2.039 3.733 7.48 8.976 8.207 5.234.73 9.714-3.522 9.998-5.559.284-2.039-3.732-4.285-8.977-5.015-5.237-.731-9.719.333-9.996 2.367z",
          style: {
            fill: "#fff",
            strokeWidth: "4.155",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M331.941 137.543c.284 2.039-3.732 7.48-8.976 8.207-5.238.73-9.718-3.522-10.005-5.559-.277-2.039 3.74-4.285 8.979-5.015 5.239-.73 9.718.333 10.002 2.368z",
          style: {
            fill: "#fff",
            strokeWidth: "2.0775",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M350.676 123.432c.863 15.994-3.445 26.888-3.988 43.914-.804 24.748 11.799 53.074-7.191 81.435" })
    ]
  }
) });

// src/canvas/ArchitectureNodeIcon.tsx
import { Fragment, jsx as jsx13, jsxs as jsxs9 } from "react/jsx-runtime";
var SEMANTIC_ICONS = {
  "arrows-split": ArrowsSplit,
  "brackets-curly": BracketsCurly,
  "folder-lock": FolderLock,
  gauge: Gauge,
  graph: Graph,
  handshake: Handshake,
  "list-checks": ListChecks,
  "list-magnifying-glass": ListMagnifyingGlass,
  monitor: Monitor,
  receipt: Receipt,
  "rocket-launch": RocketLaunch,
  scales: Scales,
  "seal-check": SealCheck,
  "user-check": UserCheck,
  "user-focus": UserFocus,
  warning: Warning
};
var positionedProps = (x, y, size) => ({
  "aria-hidden": true,
  focusable: false,
  height: size,
  width: size,
  x,
  y
});
function ArchitectureNodeIcon({ size, visual, x, y }) {
  const position = positionedProps(x, y, size);
  if (visual.source === "phosphor") {
    const SemanticIcon = SEMANTIC_ICONS[visual.key];
    return /* @__PURE__ */ jsx13(
      SemanticIcon,
      {
        ...position,
        className: "text-foreground/55",
        color: "currentColor",
        weight: "regular"
      }
    );
  }
  switch (visual.key) {
    case "express":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(Expressjs, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(ExpressjsDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "google-cloud":
      return /* @__PURE__ */ jsx13(GoogleCloud, { ...position });
    case "mcp":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(ModelContextProtocolLight, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(ModelContextProtocolDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "nextjs":
      return /* @__PURE__ */ jsx13(NextjsIconDark, { ...position, className: "dark:invert" });
    case "openai":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(Openai, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(OpenaiDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "openrouter":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(OpenrouterLight, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(OpenrouterDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "pdf":
      return /* @__PURE__ */ jsx13(Pdf, { ...position });
    case "postgresql":
      return /* @__PURE__ */ jsx13(Postgresql, { ...position });
  }
}

// src/canvas/tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// src/lib/cn.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/canvas/tooltip.tsx
import { jsx as jsx14, jsxs as jsxs10 } from "react/jsx-runtime";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx14(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  style,
  variant = "default",
  ...props
}) {
  const isGlass = variant === "glass";
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs10(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      "data-glass-refraction": isGlass ? "fallback" : void 0,
      "data-glass-surface": isGlass ? "panel" : void 0,
      "data-glass-variant": isGlass ? "strong" : void 0,
      sideOffset,
      className: cn(
        "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
        isGlass ? "liquid-glass rounded-[var(--glass-radius-panel)] text-foreground" : "rounded-none bg-foreground text-background",
        className
      ),
      style: isGlass ? {
        backdropFilter: "blur(var(--glass-current-blur))",
        WebkitBackdropFilter: "blur(var(--glass-current-blur))",
        ...style
      } : style,
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx14(
          TooltipPrimitive.Arrow,
          {
            className: cn(
              "z-50",
              isGlass ? "h-2 w-4 fill-card stroke-border/90 [stroke-width:0.75px]" : "size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-none bg-foreground fill-foreground"
            )
          }
        )
      ]
    }
  ) });
}

// src/canvas/DiagramCanvas.tsx
import { Fragment as Fragment2, jsx as jsx15, jsxs as jsxs11 } from "react/jsx-runtime";
var strokeForVariant = (variant) => variant === "branch" ? "var(--color-branch)" : "var(--color-cobalt)";
var NODE_BORDER = "var(--diagram-node-border, var(--border))";
var nodeOpacity = (node, highlight) => !highlight || highlight.nodes.has(node.id) ? 1 : DIMMED_OPACITY;
var edgeOpacity = (edge, highlight) => !highlight || highlight.edges.has(edge.id) ? 1 : DIMMED_OPACITY;
var continuationOpacity = (continuation, highlight) => !highlight || highlight.nodes.has(continuation.from) ? 1 : DIMMED_OPACITY;
function DiagramCanvas({
  layout,
  highlight,
  activeNodeId,
  focusedNodeId,
  selectedNodeId,
  onTooltipNodeChange,
  onFocusNode,
  onSelectNode,
  onDismissNode,
  instanceId,
  ariaLabel,
  nodeVisuals
}) {
  const [dismissedNodeId, setDismissedNodeId] = useState(null);
  const dismissNode = (id) => {
    setDismissedNodeId(id);
    onDismissNode(id);
  };
  const dotsId = `arch-dots-${instanceId}`;
  const fadeId = `arch-fade-${instanceId}`;
  const maskId = `arch-mask-${instanceId}`;
  const mainContinuationMarkerId = `arch-continuation-main-${instanceId}`;
  const branchContinuationMarkerId = `arch-continuation-branch-${instanceId}`;
  const edgeGradientId = (edgeId2) => `arch-edge-${instanceId}-${edgeId2.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
  return /* @__PURE__ */ jsxs11(
    "svg",
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "group",
      "aria-label": ariaLabel,
      className: "mx-auto block h-auto w-full",
      style: {
        // Never upscale past 1 unit = 1px (typography stays true to the band
        // reference), and keep the legibility floor for wide artboards.
        minWidth: Math.min(CANVAS_MIN_WIDTH, layout.width),
        maxWidth: layout.width
      },
      children: [
        /* @__PURE__ */ jsxs11("defs", { children: [
          /* @__PURE__ */ jsx15("pattern", { id: dotsId, width: "22", height: "22", patternUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsx15("circle", { cx: "1", cy: "1", r: "1", fill: "var(--foreground)" }) }),
          /* @__PURE__ */ jsxs11("linearGradient", { id: fadeId, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
            /* @__PURE__ */ jsx15("stop", { offset: "0%", stopColor: "var(--foreground)", stopOpacity: "1" }),
            /* @__PURE__ */ jsx15("stop", { offset: "55%", stopColor: "var(--foreground)", stopOpacity: "0.78" }),
            /* @__PURE__ */ jsx15("stop", { offset: "100%", stopColor: "var(--foreground)", stopOpacity: "0.26" })
          ] }),
          /* @__PURE__ */ jsx15("mask", { id: maskId, style: { maskType: "alpha" }, children: /* @__PURE__ */ jsx15("rect", { width: layout.width, height: layout.height, fill: `url(#${fadeId})` }) }),
          [
            { id: mainContinuationMarkerId, variant: "main" },
            { id: branchContinuationMarkerId, variant: "branch" }
          ].map(({ id, variant }) => /* @__PURE__ */ jsx15(
            "marker",
            {
              id,
              viewBox: "0 0 8 8",
              markerWidth: 8,
              markerHeight: 8,
              refX: 7,
              refY: 4,
              orient: "auto",
              markerUnits: "userSpaceOnUse",
              children: /* @__PURE__ */ jsx15(
                "path",
                {
                  d: "M 1 1 L 7 4 L 1 7",
                  fill: "none",
                  stroke: strokeForVariant(variant),
                  strokeWidth: EDGE_STROKE_WIDTH,
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                }
              )
            },
            id
          )),
          layout.edges.map((edge) => {
            const color = strokeForVariant(edge.variant);
            const centreOpacity = edge.variant === "main" ? 1 : 0.74;
            const edgeOpacityValue = edge.variant === "main" ? 0.24 : 0.12;
            const endOpacity = edge.arrowEnd ? centreOpacity : edgeOpacityValue;
            return /* @__PURE__ */ jsxs11(
              "linearGradient",
              {
                id: edgeGradientId(edge.id),
                gradientUnits: "userSpaceOnUse",
                x1: edge.startX,
                y1: edge.startY,
                x2: edge.endX,
                y2: edge.endY,
                children: [
                  /* @__PURE__ */ jsx15("stop", { offset: "0%", stopColor: color, stopOpacity: edgeOpacityValue }),
                  /* @__PURE__ */ jsx15("stop", { offset: "24%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx15("stop", { offset: "76%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx15("stop", { offset: "100%", stopColor: color, stopOpacity: endOpacity })
                ]
              },
              edge.id
            );
          })
        ] }),
        /* @__PURE__ */ jsx15(
          "rect",
          {
            width: layout.width,
            height: layout.height,
            fill: `url(#${dotsId})`,
            mask: `url(#${maskId})`,
            className: "opacity-[0.075] dark:opacity-[0.12]"
          }
        ),
        layout.containers?.map((container) => /* @__PURE__ */ jsxs11("g", { "data-container-id": container.id, children: [
          /* @__PURE__ */ jsx15(
            "rect",
            {
              x: container.x,
              y: container.y,
              width: container.w,
              height: container.h,
              rx: 6,
              fill: "color-mix(in srgb, var(--foreground) 2%, transparent)",
              stroke: "var(--border)",
              strokeWidth: 1
            }
          ),
          container.label ? /* @__PURE__ */ jsx15(
            "text",
            {
              x: 18,
              y: container.y + 26,
              letterSpacing: "1.6",
              className: "fill-foreground/60 font-mono text-[11.25px] uppercase",
              children: container.label
            }
          ) : null,
          container.kind ? /* @__PURE__ */ jsx15(
            "text",
            {
              x: 18,
              y: container.y + 44,
              className: "fill-foreground/40 font-mono text-[10px]",
              children: container.kind
            }
          ) : null
        ] }, container.id)),
        layout.lifelines?.map((lifeline) => /* @__PURE__ */ jsx15("g", { "data-lifeline-id": lifeline.id, children: /* @__PURE__ */ jsx15(
          "line",
          {
            x1: lifeline.x,
            y1: lifeline.y0,
            x2: lifeline.x,
            y2: lifeline.y1,
            stroke: "var(--border)",
            strokeWidth: 1,
            strokeDasharray: "2 6"
          }
        ) }, lifeline.id)),
        /* @__PURE__ */ jsx15("g", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.edges.map((edge) => /* @__PURE__ */ jsx15(
          "path",
          {
            "data-edge-id": edge.id,
            "data-edge-from": edge.from,
            "data-edge-to": edge.to,
            d: edge.d,
            stroke: `url(#${edgeGradientId(edge.id)})`,
            strokeWidth: edge.strokeWidth ?? EDGE_STROKE_WIDTH,
            strokeDasharray: edge.dashed ? "2 7" : void 0,
            markerEnd: edge.arrowEnd ? `url(#${edge.variant === "main" ? mainContinuationMarkerId : branchContinuationMarkerId})` : void 0,
            opacity: edgeOpacity(edge, highlight),
            className: [
              "transition-opacity duration-150",
              edge.variant === "main" ? "dark:[filter:drop-shadow(0_0_3px_color-mix(in_srgb,var(--color-cobalt)_18%,transparent))]" : ""
            ].join(" ")
          },
          edge.id
        )) }),
        /* @__PURE__ */ jsx15("g", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.continuations?.map((continuation) => /* @__PURE__ */ jsx15(
          "path",
          {
            "data-continuation-id": continuation.id,
            "data-continuation-from": continuation.from,
            d: continuation.d,
            stroke: strokeForVariant(continuation.variant),
            strokeWidth: EDGE_STROKE_WIDTH,
            markerEnd: `url(#${continuation.variant === "main" ? mainContinuationMarkerId : branchContinuationMarkerId})`,
            opacity: continuationOpacity(continuation, highlight),
            className: "transition-opacity duration-150"
          },
          continuation.id
        )) }),
        layout.nodes.filter((node) => node.shape === "bar").map((node) => /* @__PURE__ */ jsx15(
          "rect",
          {
            x: node.x,
            y: node.y,
            width: node.w,
            height: node.h,
            rx: 2,
            fill: node.weight === "primary" ? "color-mix(in srgb, var(--color-cobalt) 22%, transparent)" : "color-mix(in srgb, var(--color-branch) 18%, transparent)",
            stroke: node.weight === "primary" ? "color-mix(in srgb, var(--color-cobalt) 40%, transparent)" : "color-mix(in srgb, var(--color-branch) 36%, transparent)",
            strokeWidth: 1,
            className: "pointer-events-none transition-opacity duration-150",
            opacity: nodeOpacity(node, highlight)
          },
          node.id
        )),
        /* @__PURE__ */ jsx15(TooltipProvider, { delayDuration: 140, disableHoverableContent: false, skipDelayDuration: 80, children: layout.nodes.filter((node) => node.shape !== "bar").map((node) => {
          const weight = node.weight ?? "secondary";
          const isMuted = weight === "muted";
          const visual = nodeVisuals[node.id];
          const isActive = activeNodeId === node.id;
          const isTooltipOpen = isActive && dismissedNodeId !== node.id;
          const isFocused = focusedNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const accessibleName = node.kind ? `${node.kind}: ${node.label}` : node.label;
          const descriptionId = `arch-node-${instanceId}-${node.id}-description`;
          const isEvent = node.shape === "event";
          const isTable = node.shape === "table";
          const isState = node.shape === "state";
          const isTerminal = node.shape === "terminal";
          const radius = isState || isTerminal ? Math.min(CARD_R * 2.4, node.h / 2) : CARD_R;
          return /* @__PURE__ */ jsxs11(
            Tooltip,
            {
              open: isTooltipOpen,
              onOpenChange: (open) => {
                if (open) setDismissedNodeId(null);
                onTooltipNodeChange(node.id, open);
              },
              children: [
                /* @__PURE__ */ jsx15(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs11(
                  "g",
                  {
                    "data-node-id": node.id,
                    "data-node-description": node.description,
                    "data-node-trigger-id": descriptionId,
                    "data-node-active": isActive ? "true" : "false",
                    "data-node-selected": isSelected ? "true" : "false",
                    "data-node-tooltip-trigger": "true",
                    role: "button",
                    tabIndex: 0,
                    "aria-label": accessibleName,
                    "aria-describedby": descriptionId,
                    "aria-pressed": isSelected,
                    opacity: nodeOpacity(node, highlight),
                    className: "cursor-pointer transition-opacity duration-150 focus:outline-none",
                    onFocus: () => {
                      setDismissedNodeId(null);
                      onFocusNode(node.id);
                    },
                    onBlur: () => onFocusNode(null),
                    onClick: () => {
                      setDismissedNodeId(null);
                      onSelectNode(node.id);
                    },
                    onKeyDown: (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDismissedNodeId(null);
                        onSelectNode(node.id);
                      }
                    },
                    children: [
                      /* @__PURE__ */ jsx15("desc", { id: descriptionId, children: node.description }),
                      isEvent ? (() => {
                        const below = (node.nudge ?? 0) > 0;
                        const eventStroke = strokeForVariant(
                          node.weight === "primary" ? "main" : "branch"
                        );
                        const connectorEnd = below ? node.y - 38 : node.y + (node.sublabel ? 26 : 10);
                        return /* @__PURE__ */ jsxs11(Fragment2, { children: [
                          /* @__PURE__ */ jsx15(
                            "line",
                            {
                              x1: node.cx,
                              y1: node.cy,
                              x2: node.cx,
                              y2: connectorEnd,
                              stroke: eventStroke,
                              strokeWidth: EDGE_STROKE_WIDTH,
                              strokeDasharray: "2 4"
                            }
                          ),
                          /* @__PURE__ */ jsx15(
                            "circle",
                            {
                              cx: node.cx,
                              cy: node.cy,
                              r: DOT_R,
                              fill: "var(--background)",
                              stroke: eventStroke,
                              strokeWidth: 1.2
                            }
                          ),
                          /* @__PURE__ */ jsx15(
                            "circle",
                            {
                              cx: node.cx,
                              cy: node.cy,
                              r: DOT_R / 2.6,
                              fill: eventStroke
                            }
                          ),
                          node.kind ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.cx,
                              y: node.y - 24,
                              textAnchor: "middle",
                              letterSpacing: "1.4",
                              className: "fill-foreground/45 font-mono text-[10px] uppercase",
                              children: node.kind
                            }
                          ) : null,
                          /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.cx,
                              y: node.y,
                              textAnchor: "middle",
                              className: node.weight === "primary" ? "fill-foreground text-[13.5px]" : "fill-foreground/82 text-[13.5px]",
                              children: node.label
                            }
                          ),
                          node.sublabel ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.cx,
                              y: node.y + 18,
                              textAnchor: "middle",
                              className: "fill-foreground/55 font-mono text-[10.5px]",
                              children: node.sublabel
                            }
                          ) : null,
                          /* @__PURE__ */ jsx15(
                            "rect",
                            {
                              "data-node-hit-area": "true",
                              x: node.x,
                              y: below ? node.cy - 12 : node.y - 36,
                              width: node.w,
                              height: below ? node.y + 30 - (node.cy - 12) : node.cy + 12 - (node.y - 36),
                              fill: "transparent"
                            }
                          )
                        ] });
                      })() : isTable ? /* @__PURE__ */ jsxs11(Fragment2, { children: [
                        /* @__PURE__ */ jsx15(
                          "rect",
                          {
                            x: node.x,
                            y: node.y,
                            width: node.w,
                            height: node.h,
                            rx: CARD_R,
                            fill: node.weight === "primary" ? "color-mix(in srgb, var(--foreground) 4%, var(--background))" : "transparent",
                            stroke: node.weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : NODE_BORDER,
                            strokeWidth: 1
                          }
                        ),
                        /* @__PURE__ */ jsx15(
                          "path",
                          {
                            d: `M ${node.x} ${node.y + 26} L ${node.x} ${node.y + CARD_R} Q ${node.x} ${node.y} ${node.x + CARD_R} ${node.y} L ${node.x + node.w - CARD_R} ${node.y} Q ${node.x + node.w} ${node.y} ${node.x + node.w} ${node.y + CARD_R} L ${node.x + node.w} ${node.y + 26} Z`,
                            fill: "color-mix(in srgb, var(--foreground) 6%, transparent)"
                          }
                        ),
                        /* @__PURE__ */ jsx15(
                          "text",
                          {
                            x: node.x + 14,
                            y: node.y + 17.5,
                            className: node.weight === "primary" ? "fill-foreground text-[13px]" : "fill-foreground/82 text-[13px]",
                            children: node.label
                          }
                        ),
                        (node.fields ?? []).map((field, fieldIndex) => /* @__PURE__ */ jsxs11("g", { children: [
                          /* @__PURE__ */ jsx15(
                            "line",
                            {
                              x1: node.x,
                              y1: node.y + 26 + fieldIndex * 22,
                              x2: node.x + node.w,
                              y2: node.y + 26 + fieldIndex * 22,
                              stroke: NODE_BORDER,
                              strokeWidth: 0.75
                            }
                          ),
                          field.key === "pk" || field.key === "fk" ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              letterSpacing: "0.6",
                              className: field.key === "pk" ? "fill-[var(--color-cobalt)] font-mono text-[8.5px] uppercase" : "fill-[var(--color-branch)] font-mono text-[8.5px] uppercase",
                              children: field.key
                            }
                          ) : null,
                          /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + (field.key === "pk" || field.key === "fk" ? 34 : 14),
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              className: "fill-foreground/80 font-mono text-[11px]",
                              children: field.name
                            }
                          ),
                          field.type ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + node.w - 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              textAnchor: "end",
                              className: "fill-foreground/45 font-mono text-[10px]",
                              children: field.type
                            }
                          ) : null,
                          field.key === "unique" ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + node.w - (field.type ? 80 : 14),
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              textAnchor: "end",
                              className: "fill-foreground/40 font-mono text-[9.5px]",
                              children: "unique"
                            }
                          ) : null
                        ] }, `${node.id}-${field.name}`))
                      ] }) : isMuted ? /* @__PURE__ */ jsx15(
                        "line",
                        {
                          x1: node.x,
                          y1: node.y + node.h,
                          x2: node.x + node.w,
                          y2: node.y + node.h,
                          stroke: NODE_BORDER,
                          strokeWidth: 1
                        }
                      ) : /* @__PURE__ */ jsx15(
                        "rect",
                        {
                          x: node.x,
                          y: node.y,
                          width: node.w,
                          height: node.h,
                          rx: radius,
                          fill: weight === "primary" ? "color-mix(in srgb, var(--foreground) 4%, var(--background))" : "transparent",
                          stroke: weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : NODE_BORDER,
                          strokeWidth: 1,
                          className: weight === "primary" ? "opacity-100" : "opacity-[0.84] dark:opacity-70"
                        }
                      ),
                      !isEvent ? /* @__PURE__ */ jsx15(
                        "rect",
                        {
                          "data-node-hit-area": "true",
                          x: node.x,
                          y: node.y,
                          width: node.w,
                          height: node.h,
                          fill: "transparent"
                        }
                      ) : null,
                      /* @__PURE__ */ jsx15(
                        "rect",
                        {
                          "aria-hidden": "true",
                          "data-node-focus-ring": "true",
                          x: node.x - 2,
                          y: node.y - 2,
                          width: node.w + 4,
                          height: isEvent ? 60 : node.h + 4,
                          rx: radius + 2,
                          fill: "none",
                          stroke: "var(--color-cobalt)",
                          strokeWidth: 1.5,
                          opacity: isFocused ? 0.8 : 0,
                          className: "pointer-events-none transition-opacity duration-150"
                        }
                      ),
                      isState ? /* @__PURE__ */ jsxs11(Fragment2, { children: [
                        node.initial ? /* @__PURE__ */ jsx15(
                          "rect",
                          {
                            x: node.x + 4,
                            y: node.y + 4,
                            width: node.w - 8,
                            height: node.h - 8,
                            rx: radius - 4,
                            fill: "none",
                            stroke: NODE_BORDER,
                            strokeWidth: 1,
                            className: "pointer-events-none"
                          }
                        ) : null,
                        node.final ? /* @__PURE__ */ jsx15(
                          "circle",
                          {
                            cx: node.cx,
                            cy: node.cy,
                            r: 7,
                            fill: "var(--background)",
                            stroke: "var(--foreground)",
                            strokeWidth: 1.2,
                            className: "pointer-events-none"
                          }
                        ) : null
                      ] }) : null,
                      !isEvent && visual ? /* @__PURE__ */ jsx15(
                        ArchitectureNodeIcon,
                        {
                          size: NODE_ICON_SIZE,
                          visual,
                          x: node.x + 15,
                          y: node.cy - NODE_ICON_SIZE / 2
                        }
                      ) : null,
                      !isEvent && !isTable && node.kind ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 24,
                          letterSpacing: "1.6",
                          className: "fill-foreground/45 font-mono text-[11.25px] uppercase",
                          children: node.kind
                        }
                      ) : null,
                      !isEvent && !isTable ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 48,
                          className: weight === "primary" ? "fill-foreground text-[14.5px]" : "fill-foreground/82 text-[14.5px]",
                          children: node.label
                        }
                      ) : null,
                      !isEvent && !isTable && node.sublabel ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 70,
                          className: "fill-foreground/55 font-mono text-[11.25px]",
                          children: node.sublabel
                        }
                      ) : null
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxs11(
                  TooltipContent,
                  {
                    side: "top",
                    sideOffset: 10,
                    variant: "glass",
                    onEscapeKeyDown: () => dismissNode(node.id),
                    onPointerDownOutside: (event) => {
                      const target = event.detail.originalEvent.target;
                      const owningTrigger = target instanceof Element ? target.closest("[data-node-trigger-id]") : null;
                      if (owningTrigger?.getAttribute("data-node-trigger-id") === descriptionId) {
                        event.preventDefault();
                        return;
                      }
                      dismissNode(node.id);
                    },
                    className: "block max-w-[min(19rem,calc(100vw-2rem))] px-4 py-3.5 text-left",
                    children: [
                      /* @__PURE__ */ jsx15("span", { className: "block font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/45", children: node.kind ?? node.label }),
                      node.kind ? /* @__PURE__ */ jsx15("span", { className: "mt-1 block text-[13px] font-medium leading-tight text-foreground", children: node.label }) : null,
                      node.sublabel ? /* @__PURE__ */ jsx15("span", { className: "mt-1 block font-mono text-[10px] leading-relaxed text-foreground/55", children: node.sublabel }) : null,
                      /* @__PURE__ */ jsx15("span", { className: "mt-2.5 block border-t border-border/70 pt-2.5 text-[11.5px] leading-[1.55] text-foreground/78", children: node.description })
                    ]
                  }
                )
              ]
            },
            node.id
          );
        }) }),
        layout.decisions?.map((decision) => /* @__PURE__ */ jsxs11(
          "g",
          {
            "data-decision-id": decision.id,
            opacity: !highlight || highlight.nodes.has(decision.source) ? 1 : DIMMED_OPACITY,
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx15(
                "rect",
                {
                  x: decision.x - decision.width / 2,
                  y: decision.y - DECISION_PILL_H / 2,
                  width: decision.width,
                  height: DECISION_PILL_H,
                  rx: DECISION_PILL_R,
                  fill: "var(--background)",
                  stroke: "color-mix(in srgb, var(--foreground) 24%, var(--border))",
                  strokeWidth: 1
                }
              ),
              /* @__PURE__ */ jsx15(
                "text",
                {
                  x: decision.x,
                  y: decision.y + 4.5,
                  textAnchor: "middle",
                  className: "fill-foreground/82 text-[12.25px]",
                  children: decision.label
                }
              )
            ]
          },
          decision.id
        )),
        layout.edges.filter((edge) => Boolean(edge.label)).map((edge) => {
          const label = edge.label;
          return /* @__PURE__ */ jsxs11(
            "g",
            {
              "data-edge-label": edge.id,
              opacity: edgeOpacity(edge, highlight),
              className: "transition-opacity duration-150",
              children: [
                /* @__PURE__ */ jsx15(
                  "rect",
                  {
                    x: edge.labelX - edge.labelWidth / 2,
                    y: edge.labelY - PILL_H / 2,
                    width: edge.labelWidth,
                    height: PILL_H,
                    rx: PILL_R,
                    fill: "var(--background)",
                    stroke: "var(--border)",
                    strokeWidth: 1
                  }
                ),
                /* @__PURE__ */ jsx15(
                  "text",
                  {
                    x: edge.labelX,
                    y: edge.labelY + 4,
                    textAnchor: "middle",
                    className: "fill-foreground/70 font-mono text-[11.25px]",
                    children: label
                  }
                )
              ]
            },
            `${edge.id}-label`
          );
        }),
        layout.continuations?.map((continuation) => /* @__PURE__ */ jsxs11(
          "g",
          {
            "data-continuation-label": continuation.id,
            opacity: continuationOpacity(continuation, highlight),
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx15(
                "rect",
                {
                  x: continuation.labelX - continuation.labelWidth / 2,
                  y: continuation.labelY - PILL_H / 2,
                  width: continuation.labelWidth,
                  height: PILL_H,
                  rx: PILL_R,
                  fill: "var(--background)",
                  stroke: "var(--border)",
                  strokeWidth: 1
                }
              ),
              /* @__PURE__ */ jsx15(
                "text",
                {
                  x: continuation.labelX,
                  y: continuation.labelY + 4,
                  textAnchor: "middle",
                  className: "fill-foreground/70 font-mono text-[11.25px]",
                  children: continuation.displayLabel
                }
              )
            ]
          },
          `${continuation.id}-label`
        ))
      ]
    }
  );
}

// src/showcase/Showcase.tsx
import { jsx as jsx16, jsxs as jsxs12 } from "react/jsx-runtime";
registerExampleDiagrams();
var defaultStrings = {
  label: "reusable library",
  hoverHint: "hover a node, focus it with the keyboard, or tap it to explore its role and trace its path",
  heading: "Seven diagram types,",
  headingAccent: "one visual language.",
  intro: "A single SVG renderer and a declarative, localized data model \u2014 band, flowchart, sequence, state machine, ER, timeline and swimlane diagrams that share the same dot-grid, hairline-card and cobalt/branch aesthetic."
};
function ShowcasePanel({
  diagramKey,
  label,
  hoverHint,
  locale,
  hovered = false,
  interactive = true
}) {
  const diagram = getDiagram(diagramKey, locale);
  const [tooltipNode, setTooltipNode] = useState2(null);
  const [focusedNode, setFocusedNode] = useState2(null);
  const [selectedNode, setSelectedNode] = useState2(null);
  const instanceId = `${diagramKey}-${useId2().replaceAll(":", "")}`;
  const layout = useMemo(() => layoutDiagram(diagram), [diagram]);
  const edges = useMemo(() => diagramEdges(diagram), [diagram]);
  const adjacency = useMemo(() => buildAdjacency(edges), [edges]);
  const activeNode = interactive ? tooltipNode ?? focusedNode ?? selectedNode : null;
  const highlight = useMemo(
    () => activeNode ? connectedIds(activeNode, adjacency) : null,
    [activeNode, adjacency]
  );
  const caption = "caption" in diagram ? diagram.caption : "";
  const legend = "legend" in diagram ? diagram.legend : { main: "", branch: "" };
  const continuations = "continuations" in diagram ? diagram.continuations ?? [] : [];
  const continuationDescription = continuations.map((continuation) => continuation.ariaLabel ?? `${continuation.label} \xB7 ${continuation.destination}`).join("; ");
  const ariaLabel = [
    caption ? `${label}: ${caption}` : label,
    continuationDescription ? `Continuations: ${continuationDescription}` : ""
  ].filter(Boolean).join(". ");
  useEffect(() => {
    if (interactive) return;
    setTooltipNode(null);
    setFocusedNode(null);
    setSelectedNode(null);
  }, [interactive]);
  return /* @__PURE__ */ jsxs12(
    "div",
    {
      "data-diagram-panel": diagramKey,
      className: [
        "relative mt-6 bg-background transition-colors duration-200",
        hovered ? "[--diagram-frame-opacity:0.32]" : "[--diagram-frame-opacity:0.2]"
      ].join(" "),
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          setTooltipNode(null);
          setSelectedNode(null);
        }
      },
      children: [
        /* @__PURE__ */ jsx16(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "top",
            className: "pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsx16(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "left",
            className: "pointer-events-none absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsx16(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "right",
            className: "pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsxs12("div", { className: "relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/55", children: [
          /* @__PURE__ */ jsxs12("span", { className: "inline-flex shrink-0 items-center gap-3", children: [
            /* @__PURE__ */ jsx16("i", { className: "inline-block h-[7px] w-[7px] rounded-full bg-cobalt shadow-[0_0_8px_color-mix(in_srgb,var(--color-cobalt)_55%,transparent)]" }),
            label,
            " / ",
            diagramKey
          ] }),
          /* @__PURE__ */ jsx16("span", { className: "w-full text-[9.5px] leading-relaxed text-foreground/40 sm:w-auto sm:text-right sm:text-[10.5px]", children: hoverHint }),
          /* @__PURE__ */ jsx16(
            "span",
            {
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--border)_10%,var(--border)_90%,transparent)] opacity-70"
            }
          )
        ] }),
        /* @__PURE__ */ jsx16("div", { className: "overflow-x-auto px-5 py-10 sm:px-7", "data-diagram-scroll": true, children: /* @__PURE__ */ jsx16(
          DiagramCanvas,
          {
            layout,
            highlight,
            activeNodeId: activeNode,
            focusedNodeId: interactive ? focusedNode : null,
            selectedNodeId: interactive ? selectedNode : null,
            onTooltipNodeChange: (id, open) => {
              setTooltipNode((currentNode) => open ? id : currentNode === id ? null : currentNode);
            },
            onFocusNode: (id) => {
              setFocusedNode(id);
              if (id) setTooltipNode(null);
            },
            onSelectNode: (id) => setSelectedNode((currentNode) => currentNode === id ? null : id),
            onDismissNode: (id) => {
              setTooltipNode((currentNode) => currentNode === id ? null : currentNode);
              setSelectedNode((currentNode) => currentNode === id ? null : currentNode);
            },
            instanceId,
            ariaLabel,
            nodeVisuals: getDiagramVisuals(diagramKey)
          }
        ) }),
        /* @__PURE__ */ jsxs12("div", { className: "relative flex flex-wrap items-center justify-between gap-4 px-5 py-4 font-mono text-[10.5px] text-foreground/55", children: [
          /* @__PURE__ */ jsxs12("span", { className: "max-w-[68ch] leading-relaxed", children: [
            "// ",
            caption
          ] }),
          /* @__PURE__ */ jsxs12("span", { className: "inline-flex items-center gap-5", children: [
            /* @__PURE__ */ jsxs12("span", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsx16("i", { className: "inline-block h-[10px] w-[10px] rounded-full bg-cobalt" }),
              legend.main
            ] }),
            /* @__PURE__ */ jsxs12("span", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsx16("i", { className: "inline-block h-[10px] w-[10px] rounded-full bg-branch" }),
              legend.branch
            ] })
          ] })
        ] })
      ]
    }
  );
}
function DiagramShowcase({
  locale = "en",
  label = defaultStrings.label,
  hoverHint = defaultStrings.hoverHint,
  heading = defaultStrings.heading,
  headingAccent = defaultStrings.headingAccent,
  intro = defaultStrings.intro,
  entries
}) {
  return /* @__PURE__ */ jsxs12("div", { className: "pb-24 pt-16", children: [
    /* @__PURE__ */ jsxs12("div", { className: "mx-auto w-full max-w-[720px] px-4 sm:px-8", children: [
      /* @__PURE__ */ jsx16("p", { className: "text-xs uppercase tracking-[0.35em] text-muted-foreground", children: label }),
      /* @__PURE__ */ jsxs12("h1", { className: "mt-3 font-display text-[clamp(2.5rem,4vw,4rem)] leading-[0.95] tracking-[-0.05em]", children: [
        heading,
        " ",
        /* @__PURE__ */ jsx16("span", { className: "italic text-[var(--color-cobalt)]", children: headingAccent })
      ] }),
      /* @__PURE__ */ jsx16("p", { className: "mt-4 max-w-2xl text-lg leading-8 text-muted-foreground", children: intro })
    ] }),
    /* @__PURE__ */ jsx16("div", { className: "mx-auto mt-16 w-full max-w-[1180px] px-4 sm:px-8", children: entries.map((entry, index) => /* @__PURE__ */ jsxs12(
      "article",
      {
        className: "border-t border-foreground/20 py-16 first:border-t-0 first:pt-0 last:pb-4",
        children: [
          /* @__PURE__ */ jsxs12("div", { className: "mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-2", children: [
            /* @__PURE__ */ jsxs12("span", { className: "font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55", children: [
              String(index + 1).padStart(2, "0"),
              " \u2014 ",
              entry.title
            ] }),
            /* @__PURE__ */ jsx16("span", { className: "h-px flex-1 bg-foreground/16" }),
            /* @__PURE__ */ jsx16("span", { className: "font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/45", children: entry.key })
          ] }),
          /* @__PURE__ */ jsx16("h2", { className: "font-display text-[clamp(1.8rem,2.6vw,2.4rem)] font-normal leading-tight tracking-[-0.03em] text-foreground", children: entry.title }),
          /* @__PURE__ */ jsx16("p", { className: "mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74", children: entry.description }),
          /* @__PURE__ */ jsx16(
            ShowcasePanel,
            {
              diagramKey: entry.key,
              label,
              hoverHint,
              locale
            }
          )
        ]
      },
      entry.key
    )) })
  ] });
}
var Showcase_default = DiagramShowcase;
export {
  DiagramShowcase,
  Showcase_default as DiagramShowcaseDefault
};
