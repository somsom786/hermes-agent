import { describe, expect, it } from 'vitest'

import { $petActivity, $petState, derivePetState, flashPetActivity, setPetActivity } from './pet'

describe('derivePetState', () => {
  it('rests at idle by default and uses waiting when awaiting input', () => {
    expect(derivePetState({})).toBe('idle')
    expect(derivePetState({ awaitingInput: true })).toBe('listening')
  })

  it('thinks when busy or a tool is executing', () => {
    expect(derivePetState({ busy: true })).toBe('thinking')
    expect(derivePetState({ toolRunning: true })).toBe('thinking')
  })

  it('uses canonical work states for model activity', () => {
    expect(derivePetState({ reasoning: true })).toBe('thinking')
    expect(derivePetState({ reasoning: true, busy: true })).toBe('thinking')
    expect(derivePetState({ streaming: true })).toBe('talking')
    expect(derivePetState({ memorySync: true })).toBe('writing')
  })

  it('waits (blocked on the user) above the in-flight signals', () => {
    expect(derivePetState({ awaitingInput: true, toolRunning: true, busy: true })).toBe('listening')
    // but a finish beat still wins over waiting
    expect(derivePetState({ justCompleted: true, awaitingInput: true })).toBe('wave')
  })

  it('honors the full priority chain: error > celebrate > complete > tool', () => {
    expect(derivePetState({ error: true, celebrate: true, busy: true })).toBe('concerned')
    expect(derivePetState({ celebrate: true, justCompleted: true, toolRunning: true })).toBe('jump')
    expect(derivePetState({ justCompleted: true, toolRunning: true })).toBe('wave')
  })

  it('keeps physical desktop motion above conversation state', () => {
    expect(derivePetState({ dragging: true, streaming: true })).toBe('dragged')
    expect(derivePetState({ prefall: true, busy: true })).toBe('prefall')
    expect(derivePetState({ falling: true, walkingDirection: 'left' })).toBe('fall_left')
    expect(derivePetState({ falling: true, walkingDirection: 'right' })).toBe('fall_right')
    expect(derivePetState({ landing: true })).toBe('land')
    expect(derivePetState({ recovering: true })).toBe('recover')
  })

  it('surfaces offline and posture states deterministically', () => {
    expect(derivePetState({ providerOffline: true, busy: true })).toBe('offline')
    expect(derivePetState({ sleeping: true })).toBe('sleep')
    expect(derivePetState({ sitting: true })).toBe('sit')
    expect(derivePetState({ walkingDirection: 'left' })).toBe('walk_left')
    expect(derivePetState({ walkingDirection: 'right' })).toBe('walk_right')
  })
})

describe('flashPetActivity', () => {
  it('clears stale sibling beats so a completion never inherits a prior error', () => {
    // A turn errors (sad), then the next turn finishes cleanly. The celebrate
    // beat must win — error is highest priority, so a merge-only flash would
    // keep the pet on the failed pose.
    setPetActivity({ error: true })
    flashPetActivity({ celebrate: true })

    expect($petActivity.get().error).toBe(false)
    expect($petState.get()).toBe('jump')

    setPetActivity({})
  })
})
