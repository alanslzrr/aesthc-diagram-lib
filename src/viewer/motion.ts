import type { StoryStep } from '../editor-core/types'

export type PlaybackOwner = 'story' | 'route' | 'trace' | null
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended'

export interface PlaybackEnvironment {
  clock?: () => number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}
export interface PlaybackCallbacks {
  onStep: (index: number) => void
  onEnd: () => void
  onStop: () => void
}
/**
 * Finite story playback with a single owner. Never auto-starts. Manual
 * interaction, Escape, hidden tab, print and reduced-motion stop it; the
 * reduced-motion consumer shows static states with working Next/Previous.
 */
export class StoryPlayback {
  private stepIndex = 0
  private timer: unknown | undefined
  private state: PlaybackState = 'idle'
  private callbacks: PlaybackCallbacks
  private clock: () => number
  private setTimer: (callback: () => void, ms: number) => unknown
  private clearTimer: (handle: unknown) => void
  private ownsMotion: PlaybackOwner
  constructor(
    private steps: StoryStep[],
    callbacks: PlaybackCallbacks,
    environment: PlaybackEnvironment = {},
    owner: Exclude<PlaybackOwner, null> = 'story',
  ) {
    this.callbacks = callbacks
    this.clock = environment.clock ?? (() => performance.now())
    this.setTimer = environment.setTimer ?? ((callback, ms) => setTimeout(callback, ms))
    this.clearTimer =
      environment.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))
    this.ownsMotion = owner
    void this.clock
  }
  getOwner(): PlaybackOwner {
    return this.state === 'idle' || this.state === 'ended' ? null : this.ownsMotion
  }
  getState(): PlaybackState {
    return this.state
  }
  getIndex(): number {
    return this.stepIndex
  }
  play(fromIndex?: number): boolean {
    if (this.steps.length === 0) return false
    this.clearTimer(this.timer)
    this.timer = undefined
    this.stepIndex = fromIndex === undefined ? this.stepIndex : Math.max(0, fromIndex)
    this.state = 'playing'
    this.callbacks.onStep(this.stepIndex)
    this.scheduleNext()
    return true
  }
  pause(): void {
    if (this.state !== 'playing') return
    this.clearTimer(this.timer)
    this.timer = undefined
    this.state = 'paused'
  }
  next(): boolean {
    if (this.steps.length === 0) return false
    this.clearTimer(this.timer)
    this.timer = undefined
    const next = Math.min(this.stepIndex + 1, this.steps.length - 1)
    if (next === this.stepIndex) return false
    this.stepIndex = next
    this.callbacks.onStep(this.stepIndex)
    if (this.state === 'playing') this.scheduleNext()
    return true
  }
  prev(): boolean {
    if (this.steps.length === 0) return false
    this.clearTimer(this.timer)
    this.timer = undefined
    const previous = Math.max(this.stepIndex - 1, 0)
    if (previous === this.stepIndex) return false
    this.stepIndex = previous
    this.callbacks.onStep(this.stepIndex)
    if (this.state === 'playing') this.scheduleNext()
    return true
  }
  stop(): void {
    this.clearTimer(this.timer)
    this.timer = undefined
    if (this.state !== 'idle' && this.state !== 'ended') this.callbacks.onStop()
    this.state = 'idle'
    this.stepIndex = 0
  }
  end(): void {
    this.clearTimer(this.timer)
    this.timer = undefined
    if (this.state === 'playing') this.callbacks.onEnd()
    this.state = 'ended'
  }
  dispose(): void {
    this.clearTimer(this.timer)
    this.timer = undefined
    this.state = 'idle'
    this.stepIndex = 0
  }
  private scheduleNext(): void {
    if (this.state !== 'playing') return
    const step = this.steps[this.stepIndex]
    this.clearTimer(this.timer)
    this.timer = undefined
    if (this.stepIndex >= this.steps.length - 1) {
      this.timer = this.setTimer(() => this.end(), step.durationMs)
      return
    }
    this.timer = this.setTimer(() => {
      this.stepIndex += 1
      this.callbacks.onStep(this.stepIndex)
      this.scheduleNext()
    }, step.durationMs)
  }
}
export interface MotionOwnerGuard {
  owner: PlaybackOwner
  claim(owner: Exclude<PlaybackOwner, null>): boolean
  release(owner: Exclude<PlaybackOwner, null>): void
}
/** Exactly one owner can move the camera at a time (story, route or trace). */
export function createMotionOwnerGuard(): MotionOwnerGuard {
  let owner: PlaybackOwner = null
  return {
    get owner() {
      return owner
    },
    claim(next) {
      if (owner !== null && owner !== next) return false
      owner = next
      return true
    },
    release(previous) {
      if (owner === previous) owner = null
    },
  }
}
