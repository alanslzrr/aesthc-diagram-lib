'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '../lib/cn'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content> & {
  variant?: 'default' | 'glass'
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  style,
  variant = 'default',
  ...props
}: TooltipContentProps) {
  const isGlass = variant === 'glass'

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        data-glass-refraction={isGlass ? 'fallback' : undefined}
        data-glass-surface={isGlass ? 'panel' : undefined}
        data-glass-variant={isGlass ? 'strong' : undefined}
        sideOffset={sideOffset}
        className={cn(
          'z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none',
          isGlass
            ? 'liquid-glass rounded-[var(--glass-radius-panel)] text-foreground'
            : 'rounded-none bg-foreground text-background',
          className,
        )}
        style={
          isGlass
            ? {
                backdropFilter: 'blur(var(--glass-current-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-current-blur))',
                ...style,
              }
            : style
        }
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          className={cn(
            'z-50',
            isGlass
              ? 'h-2 w-4 fill-card stroke-border/90 [stroke-width:0.75px]'
              : 'size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-none bg-foreground fill-foreground',
          )}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
