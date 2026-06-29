'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { buddyHomeBounds, shouldHideMainOnClose, shouldShowMainOnReady } = require('./companion-mode.cjs')

test('companion-first startup keeps the main window hidden', () => {
  assert.equal(shouldShowMainOnReady(true), false)
  assert.equal(shouldShowMainOnReady(false), true)
})

test('closing the main window hides it unless the application is quitting', () => {
  assert.equal(
    shouldHideMainOnClose({
      companionMode: true,
      isAppQuitting: false,
      isQuittingForHandoff: false
    }),
    true
  )
  assert.equal(
    shouldHideMainOnClose({
      companionMode: true,
      isAppQuitting: true,
      isQuittingForHandoff: false
    }),
    false
  )
})

test('Bring Buddy Back places the overlay inside the primary work area', () => {
  assert.deepEqual(
    buddyHomeBounds({ x: -1920, y: 0, width: 1920, height: 1080 }, { width: 240, height: 300 }),
    { x: -264, y: 756, width: 240, height: 300 }
  )
})
