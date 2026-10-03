import type { DiagramDocument, ResolveRendererRegistry, Result } from '../editor-core/types'
import { failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import { resolveDocument } from '../editor-core/scene'
import { renderSvg } from '../render'
import { createCanvasTextMeasurer, estimateTextWidth } from '../geometry/text'

/** Capability gate: the recorder and a canvas stream must exist and a WebM
 * codec must be really supported. No camera or microphone is ever requested. */
export function webmCapability(): { supported: boolean; mimeType: string | null } {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  )
    return { supported: false, mimeType: null }
  for (const mimeType of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return { supported: true, mimeType }
    } catch {
      /* keep probing */
    }
  }
  return { supported: false, mimeType: null }
}
export interface MotionOptions {
  fps?: number
  scale?: number
  signal?: AbortSignal
  /** Reduced motion never records: the static story navigation stays. */
  reducedMotion?: boolean
  /** Effective appearance for the recorded frames; defaults to the document mode. */
  theme?: 'light' | 'dark'
  /** Trusted renderers; without one a custom story fails instead of freezing a placeholder. */
  renderers?: ResolveRendererRegistry
}
export interface MotionArtifact {
  bytes: Uint8Array
  receipt: {
    documentId: string
    revision: number
    mimeType: string
    bytes: number
    width: number
    height: number
    fps: number
    durationMs: number
    frameCount: number
    /** Written but never verified as decodable by the exporter itself. */
    verified: false
    diagnostics: []
  }
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/**
 * Records a finite story to WebM from a canvas stream only. The duration is
 * bounded by the validated story, every resource (tracks, object URLs, canvas)
 * is released on success, failure and abort, and an abort never reports success.
 */
export async function exportStoryWebm(
  input: DiagramDocument,
  options: MotionOptions = {},
): Promise<Result<MotionArtifact>> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  if (options.reducedMotion) return failure('webm.reduced-motion')
  const capability = webmCapability()
  if (!capability.supported || !capability.mimeType) return failure('webm.unavailable')
  if (document.story.length === 0) return failure('webm.empty')
  const numeric = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const fps = Math.max(1, Math.min(60, Math.round(numeric(options.fps, 30))))
  const scale = Math.max(0.25, Math.min(2, numeric(options.scale, 1)))
  const totalDuration = document.story.reduce((sum, step) => sum + step.durationMs, 0)
  if (totalDuration <= 0 || totalDuration > 120000) return failure('limit.story')
  const theme = options.theme ?? document.presentation.theme.mode
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'motion',
    theme,
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
    renderers: options.renderers,
  })
  if (!resolved.ok) return resolved
  const missingRenderer = resolved.diagnostics.find((diagnostic) =>
    diagnostic.code.startsWith('renderer.'),
  )
  if (missingRenderer) return failure(missingRenderer.code)
  const width = Math.max(2, Math.ceil(resolved.value.layout.width * scale))
  const height = Math.max(2, Math.ceil(resolved.value.layout.height * scale))
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width > 16384 ||
    height > 16384 ||
    width * height > 32_000_000
  )
    return failure('export.pixels')
  const canvas = window.document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return failure('export.context')
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let started = false
  let aborted = false
  let stoppedResolve: (() => void) | null = null
  const recorderStopped = new Promise<void>((resolve) => {
    stoppedResolve = resolve
  })
  const settleRecorder = () => stoppedResolve?.()
  const onAbort = () => {
    aborted = true
    settleRecorder()
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })
  const chunks: Blob[] = []
  let frameCount = 0
  try {
    // Automatic capture at the target rate: manual requestFrame streams stay
    // empty in some Chromium builds. Allocation and initialization share one
    // guarded lifecycle so a throwing constructor never leaks the tracks.
    stream = canvas.captureStream(fps)
    recorder = new MediaRecorder(stream, { mimeType: capability.mimeType })
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onstop = settleRecorder
    recorder.onerror = settleRecorder
    recorder.start()
    started = true
    for (const step of document.story) {
      if (aborted || options.signal?.aborted) return failure('operation.aborted')
      const view = document.views.find((candidate) => candidate.id === step.viewId)
      const svg = renderSvg(document, resolved.value, {
        instanceId: `motion-${step.id}`,
        theme,
        highlight: view
          ? {
              nodes: new Set(view.focus.nodeIds),
              edges: new Set(view.focus.edgeIds),
            }
          : undefined,
      })
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      const image = new Image()
      try {
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            image.src = ''
            reject(Error('operation.aborted'))
          }
          options.signal?.addEventListener('abort', abort, { once: true })
          image.onload = () => {
            options.signal?.removeEventListener('abort', abort)
            resolve()
          }
          image.onerror = () => {
            options.signal?.removeEventListener('abort', abort)
            reject(Error('export.image'))
          }
          image.src = url
        })
        const frames = Math.max(1, Math.round(step.durationMs / (1000 / fps)))
        for (let frame = 0; frame < frames; frame++) {
          if (aborted || options.signal?.aborted) return failure('operation.aborted')
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          frameCount += 1
          await delay(1000 / fps)
        }
      } finally {
        image.src = ''
        URL.revokeObjectURL(url)
      }
    }
    if (aborted || options.signal?.aborted) return failure('operation.aborted')
    recorder.stop()
    started = false
    await Promise.race([recorderStopped, delay(2000)])
    if (aborted || options.signal?.aborted) return failure('operation.aborted')
    const blob = new Blob(chunks, { type: capability.mimeType })
    if (!blob.size) return failure('webm.empty')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    return success({
      bytes,
      receipt: {
        documentId: document.id,
        revision: document.revision,
        mimeType: capability.mimeType,
        bytes: bytes.byteLength,
        width: canvas.width,
        height: canvas.height,
        fps,
        durationMs: totalDuration,
        frameCount,
        verified: false,
        diagnostics: [],
      },
    })
  } catch (error) {
    return failure(
      error instanceof Error && error.message === 'operation.aborted'
        ? 'operation.aborted'
        : error instanceof Error && error.message === 'export.image'
          ? 'export.image'
          : 'webm.recorder',
    )
  } finally {
    options.signal?.removeEventListener('abort', onAbort)
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* already stopped */
      }
    }
    if (stream)
      for (const activeTrack of stream.getTracks()) {
        if (activeTrack.readyState !== 'ended') activeTrack.stop()
      }
    // Only an active, successfully started recorder can emit `stop`; never
    // wait for an event an inactive recorder cannot produce.
    if (started && recorder && recorder.state !== 'inactive')
      await Promise.race([recorderStopped, delay(2000)])
    canvas.width = 0
    canvas.height = 0
  }
}
