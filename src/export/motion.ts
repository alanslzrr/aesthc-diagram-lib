import type { DiagramDocument, Result } from '../editor-core/types'
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
  const fps = Math.max(1, Math.min(60, Math.round(options.fps ?? 30)))
  const scale = Math.max(0.25, Math.min(2, options.scale ?? 1))
  const totalDuration = document.story.reduce((sum, step) => sum + step.durationMs, 0)
  if (totalDuration <= 0 || totalDuration > 120000) return failure('limit.story')
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'motion',
    skipDiagnostics: true,
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
  })
  if (!resolved.ok) return resolved
  const canvas = window.document.createElement('canvas')
  canvas.width = Math.max(2, Math.ceil(resolved.value.layout.width * scale))
  canvas.height = Math.max(2, Math.ceil(resolved.value.layout.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return failure('export.context')
  // Automatic capture at the target rate: manual requestFrame streams stay
  // empty in some Chromium builds.
  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType: capability.mimeType })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  let aborted = false
  const onAbort = () => {
    aborted = true
  }
  options.signal?.addEventListener('abort', onAbort, { once: true })
  const recorderStopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  let frameCount = 0
  try {
    recorder.start()
    for (const step of document.story) {
      if (aborted || options.signal?.aborted) return failure('operation.aborted')
      const view = document.views.find((candidate) => candidate.id === step.viewId)
      const svg = renderSvg(document, resolved.value, {
        instanceId: `motion-${step.id}`,
        theme: document.presentation.theme.mode,
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
          image.onload = () => resolve()
          image.onerror = () => reject(Error('export.image'))
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
    await recorderStopped
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
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* already stopped */
      }
    }
    for (const activeTrack of stream.getTracks()) {
      if (activeTrack.readyState !== 'ended') activeTrack.stop()
    }
    await recorderStopped
    canvas.width = 0
    canvas.height = 0
  }
}
