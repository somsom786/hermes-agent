import { describe, expect, it } from 'vitest'

import { advanceReleaseMotion, advanceWalkBounds, createAutonomousWalkPlan, createReleaseMotion } from './pet-motion'

describe('createAutonomousWalkPlan', () => {
  it('creates bounded, deterministic short-walk plans', () => {
    const values = [0, 0.25, 0.5, 0.75, 1]
    let index = 0
    const plan = createAutonomousWalkPlan(() => values[index++] ?? 0)

    expect(plan).toEqual({
      cooldownMs: 8_000,
      direction: 'left',
      stepPx: 3,
      steps: 36,
      tickMs: 85
    })
  })
})

describe('advanceWalkBounds', () => {
  it('moves horizontally without changing the overlay size or height', () => {
    const bounds = { height: 300, width: 240, x: 120, y: 640 }

    expect(advanceWalkBounds(bounds, 'left', 3)).toEqual({ ...bounds, x: 117 })
    expect(advanceWalkBounds(bounds, 'right', 3)).toEqual({ ...bounds, x: 123 })
  })

  it('stops at the visible work-area edge', () => {
    const bounds = { height: 300, width: 240, x: 758, y: 640 }
    const workArea = { height: 900, width: 1000, x: 0, y: 0 }

    expect(advanceWalkBounds(bounds, 'right', 5, workArea)).toEqual({ ...bounds, x: 760 })
  })
})

describe('release motion', () => {
  it('turns pointer movement into a bounded horizontal release velocity', () => {
    expect(createReleaseMotion(-140)).toEqual({ velocityX: -7, velocityY: 0 })
    expect(createReleaseMotion(28)).toEqual({ velocityX: 2, velocityY: 0 })
    expect(createReleaseMotion(140)).toEqual({ velocityX: 7, velocityY: 0 })
  })

  it('falls, slows horizontal movement, and lands on the work-area floor', () => {
    const workArea = { height: 800, width: 1200, x: -1200, y: 0 }

    const first = advanceReleaseMotion(
      { height: 200, width: 180, x: -600, y: 500 },
      { velocityX: 5, velocityY: 0 },
      workArea,
      10
    )

    expect(first.bounds).toEqual({ height: 200, width: 180, x: -595, y: 510 })
    expect(first.landed).toBe(false)
    expect(first.motion.velocityX).toBeCloseTo(4.6)
    expect(first.motion.velocityY).toBe(10)

    const landed = advanceReleaseMotion(first.bounds, { velocityX: 4.6, velocityY: 90 }, workArea, 10)

    expect(landed.bounds).toEqual({ height: 200, width: 180, x: -590, y: 600 })
    expect(landed.landed).toBe(true)
    expect(landed.motion.velocityX).toBeCloseTo(4.232)
    expect(landed.motion.velocityY).toBe(0)
  })

  it('clamps release movement within negative-coordinate monitor bounds', () => {
    const frame = advanceReleaseMotion(
      { height: 200, width: 180, x: -1198, y: 590 },
      { velocityX: -6, velocityY: 8 },
      { height: 800, width: 1200, x: -1200, y: 0 },
      10
    )

    expect(frame.bounds).toEqual({ height: 200, width: 180, x: -1200, y: 600 })
    expect(frame.landed).toBe(true)
    expect(frame.motion).toEqual({ velocityX: 0, velocityY: 0 })
  })
})
