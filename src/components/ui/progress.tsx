"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type ProgressContextValue = {
  value: number
  max: number
}

const ProgressContext = React.createContext<ProgressContextValue | null>(null)

function Progress({
  className,
  value = 0,
  max = 100,
  children,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const safeMax = Math.max(1, Number(max) || 100)
  const safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0))
  const percent = (safeValue / safeMax) * 100

  return (
    <ProgressContext.Provider value={{ value: safeValue, max: safeMax }}>
      <ProgressPrimitive.Root
        data-slot="progress"
        className={cn("grid gap-2", className)}
        value={safeValue}
        max={safeMax}
        {...props}
      >
        {children}
        <ProgressTrack>
          <ProgressIndicator style={{ transform: `translateX(-${100 - percent}%)` }} />
        </ProgressTrack>
      </ProgressPrimitive.Root>
    </ProgressContext.Provider>
  )
}

function ProgressLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="progress-label"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const context = React.useContext(ProgressContext)
  const percent = context ? Math.round((context.value / context.max) * 100) : 0

  return (
    <span
      data-slot="progress-value"
      className={cn("text-sm font-semibold text-muted-foreground", className)}
      {...props}
    >
      %{percent}
    </span>
  )
}

function ProgressTrack({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="progress-track"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Indicator>) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("size-full flex-1 bg-primary transition-transform", className)}
      {...props}
    />
  )
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue }
