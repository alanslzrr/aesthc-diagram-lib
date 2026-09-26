import type { RouteResult } from '../graph'

export type TraceState = 'idle' | 'playing' | 'paused' | 'ended'
export interface TraceCallbacks {
  onStep: (edgeIndex: number, edgeId: string) => void
  onEnd: () => void
  onStop: () => void
}
export interface TraceEnvironment {
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}
/**
 * Finite trace playback over an authored route: one edge at a time with a
 * fixed per-edge duration, a single motion owner and no auto-start. It never
 * invents edges: the sequence is exactly the route receipt.
 */
export function createTracePlayer(
  route: Pick<RouteResult, 'edgeIds'>,
  callbacks: TraceCallbacks,
  options: { edgeDurationMs?: number; environment?: TraceEnvironment } = {},
) {
  const edges = [...route.edgeIds]
  const duration = options.edgeDurationMs ?? 400
  const setTimer = options.environment?.setTimer ?? ((callback, ms) => setTimeout(callback, ms))
  const clearTimer =
    options.environment?.clearTimer ??
    ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  let timer: unknown | undefined
  let index = -1
  let state: TraceState = 'idle'
  function emit() {
    if (index >= 0 && index < edges.length) callbacks.onStep(index, edges[index])
  }
  function schedule() {
    clearTimer(timer)
    timer = setTimer(() => {
      if (state !== 'playing') return
      if (index >= edges.length - 1) {
        state = 'ended'
        callbacks.onEnd()
        return
      }
      index += 1
      emit()
      schedule()
    }, duration)
  }
  return {
    state: () => state,
    index: () => index,
    edgeIds: () => [...edges],
    play(from = 0) {
      if (edges.length === 0) return false
      clearTimer(timer)
      index = Math.max(0, Math.min(from, edges.length - 1))
      state = 'playing'
      emit()
      schedule()
      return true
    },
    pause() {
      if (state !== 'playing') return
      clearTimer(timer)
      state = 'paused'
    },
    next() {
      if (index >= edges.length - 1) return false
      clearTimer(timer)
      index += 1
      emit()
      if (state === 'playing') schedule()
      return true
    },
    prev() {
      if (index <= 0) return false
      clearTimer(timer)
      index -= 1
      emit()
      if (state === 'playing') schedule()
      return true
    },
    stop() {
      clearTimer(timer)
      if (state !== 'idle' && state !== 'ended') callbacks.onStop()
      state = 'idle'
      index = -1
    },
  }
}
