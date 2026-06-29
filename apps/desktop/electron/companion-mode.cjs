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

function clamp(value, min, max) {
  if (max < min) return min

  return Math.min(max, Math.max(min, value))
}

function clampBoundsToWorkArea(workArea, bounds) {
  const width = Math.max(80, Math.round(bounds.width))
  const height = Math.max(80, Math.round(bounds.height))
  const maxX = workArea.x + workArea.width - width
  const maxY = workArea.y + workArea.height - height

  return {
    x: clamp(Math.round(bounds.x), workArea.x, maxX),
    y: clamp(Math.round(bounds.y), workArea.y, maxY),
    width,
    height
  }
}

function nearestWorkArea(bounds, workAreas) {
  if (!Array.isArray(workAreas) || workAreas.length === 0) {
    return { height: 720, width: 1280, x: 0, y: 0 }
  }

  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const containing = workAreas.find(
    area => centerX >= area.x && centerX <= area.x + area.width && centerY >= area.y && centerY <= area.y + area.height
  )

  if (containing) {
    return containing
  }

  return workAreas
    .slice()
    .sort((a, b) => {
      const ax = a.x + a.width / 2
      const ay = a.y + a.height / 2
      const bx = b.x + b.width / 2
      const by = b.y + b.height / 2

      return Math.hypot(centerX - ax, centerY - ay) - Math.hypot(centerX - bx, centerY - by)
    })
    .at(0)
}

function clampBoundsToDisplays(bounds, displays) {
  const workAreas = displays.map(display => display.workArea || display)
  const normalized = {
    height: Math.max(80, Math.round(bounds.height)),
    width: Math.max(80, Math.round(bounds.width)),
    x: Number.isFinite(bounds.x) ? Math.round(bounds.x) : 0,
    y: Number.isFinite(bounds.y) ? Math.round(bounds.y) : 0
  }

  return clampBoundsToWorkArea(nearestWorkArea(normalized, workAreas), normalized)
}

module.exports = {
  buddyHomeBounds,
  clampBoundsToDisplays,
  clampBoundsToWorkArea,
  shouldHideMainOnClose,
  shouldShowMainOnReady
}
