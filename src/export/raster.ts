import type { Result } from '../editor-core/types'
import { failure, success } from '../editor-core/data'

/** Rasterizes an SVG string through a data-free canvas. Browser only; the
 * object URL and canvas are always released, aborts included. */
export async function rasterizeSvg(
  svg: string,
  mime: string,
  width: number,
  height: number,
  signal?: AbortSignal,
): Promise<Result<Uint8Array>> {
  if (typeof document === 'undefined' || typeof Image === 'undefined')
    return failure('export.environment')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return failure('export.context')
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
    image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        cleanup()
        reject(Error('operation.aborted'))
      }
      const cleanup = () => {
        image.onload = null
        image.onerror = null
        signal?.removeEventListener('abort', abort)
      }
      image.onload = () => {
        cleanup()
        resolve()
      }
      image.onerror = () => {
        cleanup()
        reject(Error('export.image'))
      }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
      else image.src = url
    })
    if (signal?.aborted) return failure('operation.aborted')
    context.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92))
    if (signal?.aborted) return failure('operation.aborted')
    if (!blob) return failure('export.encode')
    if (blob.type !== mime) return failure('export.mime')
    return success(new Uint8Array(await blob.arrayBuffer()))
  } catch (error) {
    return failure(
      error instanceof Error && error.message === 'operation.aborted'
        ? 'operation.aborted'
        : error instanceof Error && error.message === 'export.image'
          ? 'export.image'
          : 'export.raster',
    )
  } finally {
    image.src = ''
    URL.revokeObjectURL(url)
    canvas.width = 0
    canvas.height = 0
  }
}
