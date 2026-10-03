/** Bound browser operations that do not themselves expose cancellation. Late
 * callbacks are ignored; callers still release their own resources in finally. */
export function waitForExport<T>(
  operation: Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      action()
    }
    const abort = () => finish(() => reject(Error('operation.aborted')))
    const timer = setTimeout(() => finish(() => reject(Error('export.timeout'))), timeoutMs)
    // Attach both handlers even when already aborted, so a later rejection of
    // the underlying browser operation cannot become an unhandled rejection.
    operation.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    )
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  })
}
