import type { ComponentProps } from 'react'
import * as Primitive from '@radix-ui/react-scroll-area'

// shadcn/Radix composition, styled with the shared host tokens.
export function ScrollArea({
  children,
  className = '',
  orientation = 'vertical',
  label,
  ...props
}: ComponentProps<typeof Primitive.Root> & {
  orientation?: 'vertical' | 'horizontal' | 'both'
  label?: string
}) {
  return (
    <Primitive.Root {...props} className={`scroll-area ${className}`} type="auto">
      <Primitive.Viewport
        className="scroll-viewport"
        tabIndex={0}
        role={label ? 'region' : undefined}
        aria-label={label}
      >
        {children}
      </Primitive.Viewport>
      {(orientation === 'both' ? (['vertical', 'horizontal'] as const) : [orientation]).map(
        (axis) => (
          <Primitive.Scrollbar key={axis} className="scroll-bar" orientation={axis}>
            <Primitive.Thumb className="scroll-thumb" />
          </Primitive.Scrollbar>
        ),
      )}
      <Primitive.Corner />
    </Primitive.Root>
  )
}
