import { useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Viewport } from '../editor-core/types'

export interface MinimapProps {
  /** Rendered SVG source of the full diagram. */
  svg: string
  layoutWidth: number
  layoutHeight: number
  /** Viewport center in world coordinates with its zoom. */
  camera: Viewport
  /** Visible world rectangle at zoom 1 (the container size). */
  viewWorldSize: { width: number; height: number }
  onNavigate: (center: { x: number; y: number }) => void
}
/** Overview of the full diagram with a draggable viewport rect. Clicking or
 * dragging on the minimap moves the camera; the diagram itself never changes. */
export function Minimap({
  svg,
  layoutWidth,
  layoutHeight,
  camera,
  viewWorldSize,
  onNavigate,
}: MinimapProps) {
  const frame = useRef<HTMLDivElement>(null)
  const scale = useMemo(() => {
    const width = 180
    return layoutWidth > 0 ? width / layoutWidth : 1
  }, [layoutWidth])
  const viewport = {
    left: (camera.x - viewWorldSize.width / 2 / camera.zoom) * scale,
    top: (camera.y - viewWorldSize.height / 2 / camera.zoom) * scale,
    width: (viewWorldSize.width / camera.zoom) * scale,
    height: (viewWorldSize.height / camera.zoom) * scale,
  }
  function moveTo(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = frame.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left) / scale
    const y = (event.clientY - bounds.top) / scale
    onNavigate({ x, y })
  }
  return (
    <div
      ref={frame}
      className="adl-viewer-minimap"
      role="button"
      aria-label="Overview map. Click to navigate the diagram."
      onPointerDown={(event) => {
        ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
        moveTo(event)
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return
        moveTo(event)
      }}
    >
      <div
        className="adl-viewer-minimap-svg"
        style={{ width: layoutWidth * scale, height: layoutHeight * scale }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div
        className="adl-viewer-minimap-viewport"
        style={{
          left: viewport.left,
          top: viewport.top,
          width: Math.max(24, viewport.width),
          height: Math.max(16, viewport.height),
        }}
      />
    </div>
  )
}
