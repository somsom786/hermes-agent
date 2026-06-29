'use strict'

function shouldShowMainOnReady(companionMode) {
  return !companionMode
}

function shouldHideMainOnClose({ companionMode, isAppQuitting, isQuittingForHandoff }) {
  return Boolean(companionMode && !isAppQuitting && !isQuittingForHandoff)
}

function buddyHomeBounds(workArea, size, margin = 24) {
  const width = Math.max(80, Math.round(size.width))
  const height = Math.max(80, Math.round(size.height))
  const right = workArea.x + workArea.width
  const bottom = workArea.y + workArea.height

  return {
    x: Math.max(workArea.x, Math.round(right - width - margin)),
    y: Math.max(workArea.y, Math.round(bottom - height - margin)),
    width,
    height
  }
}

module.exports = {
  buddyHomeBounds,
  shouldHideMainOnClose,
  shouldShowMainOnReady
}
