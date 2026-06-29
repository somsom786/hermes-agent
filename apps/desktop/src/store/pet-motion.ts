import type { PetOverlayBounds } from './pet-overlay'

export type WalkDirection = 'left' | 'right'

export interface AutonomousWalkPlan {
  cooldownMs: number
  direction: WalkDirection
  stepPx: number
  steps: number
  tickMs: number
}

export interface PetWorkArea {
  height: number
  width: number
  x: number
  y: number
}

export interface ReleaseMotion {
  velocityX: number
  velocityY: number
}

export interface ReleaseMotionFrame {
  bounds: PetOverlayBounds
  landed: boolean
  motion: ReleaseMotion
}

function between(min: number, max: number, random: () => number): number {
  return Math.round(min + (max - min) * random())
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function createAutonomousWalkPlan(random: () => number = Math.random): AutonomousWalkPlan {
  return {
    cooldownMs: between(8_000, 18_000, random),
    direction: random() < 0.5 ? 'left' : 'right',
    stepPx: between(2, 4, random),
    steps: between(18, 42, random),
    tickMs: between(55, 85, random)
  }
}

export function advanceWalkBounds(
  bounds: PetOverlayBounds,
  direction: WalkDirection,
  stepPx: number,
  workArea?: PetWorkArea
): PetOverlayBounds {
  const next = {
    ...bounds,
    x: Math.round(bounds.x + (direction === 'left' ? -stepPx : stepPx))
  }

  if (!workArea) {
    return next
  }

  return {
    ...next,
    x: clamp(next.x, workArea.x, workArea.x + Math.max(0, workArea.width - bounds.width))
  }
}

export function createReleaseMotion(deltaX: number): ReleaseMotion {
  return {
    velocityX: clamp(deltaX / 14, -7, 7),
    velocityY: 0
  }
}

export function advanceReleaseMotion(
  bounds: PetOverlayBounds,
  motion: ReleaseMotion,
  workArea: PetWorkArea,
  gravityPx = 1.8
): ReleaseMotionFrame {
  const maxX = workArea.x + Math.max(0, workArea.width - bounds.width)
  const floorY = workArea.y + Math.max(0, workArea.height - bounds.height)
  const nextVelocityY = motion.velocityY + gravityPx
  const rawX = bounds.x + motion.velocityX
  const rawY = bounds.y + nextVelocityY
  const nextX = clamp(rawX, workArea.x, maxX)
  const nextY = Math.min(rawY, floorY)
  const landed = nextY >= floorY

  return {
    bounds: {
      ...bounds,
      x: Math.round(nextX),
      y: Math.round(nextY)
    },
    landed,
    motion: {
      velocityX: nextX === rawX ? motion.velocityX * 0.92 : 0,
      velocityY: landed ? 0 : nextVelocityY
    }
  }
}
