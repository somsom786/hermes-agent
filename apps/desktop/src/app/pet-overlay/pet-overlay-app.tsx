import './trading-buddy-pet.css'

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { PetBubble } from '@/components/pet/pet-bubble'
import { PetSprite } from '@/components/pet/pet-sprite'
import { type PetZoomAnchor, usePetZoomGesture } from '@/components/pet/use-pet-zoom-gesture'
import {
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  NotebookTabs,
  Palette,
  PawPrint,
  RefreshCw,
  Settings,
  Sun,
  X
} from '@/lib/icons'
import { $petActivity, $petInfo, setPetInfo } from '@/store/pet'
import { overlayWindowSize } from '@/store/pet-overlay'
import { setAwaitingResponse, setBusy } from '@/store/session'

const DEFAULT_FRAME_W = 192
const DEFAULT_FRAME_H = 208
const DEFAULT_SCALE = 0.33
const PET_PADDING_BOTTOM = 24
const ALPHA_HIT_THRESHOLD = 16
const CLICK_SLOP_PX = 3
const DOUBLE_CLICK_MS = 250

interface DragState {
  startX: number
  startY: number
  offX: number
  offY: number
  width: number
  height: number
  moved: boolean
}

type PetMenuControl = 'bring-back' | 'open-journal' | 'open-settings' | 'open-skins' | 'quit' | 'restart-buddy'

export function PetOverlayApp() {
  const info = useStore($petInfo)
  const activity = useStore($petActivity)
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [quiet, setQuiet] = useState(false)
  const [sleeping, setSleeping] = useState(false)
  const [unread, setUnread] = useState(false)

  const dragRef = useRef<DragState | null>(null)
  const zoomAnchorRef = useRef<PetZoomAnchor | null>(null)
  const petRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const ignoreRef = useRef(true)
  const composerOpenRef = useRef(false)
  const menuOpenRef = useRef(false)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const setIgnore = (ignore: boolean) => {
    if (ignoreRef.current !== ignore) {
      ignoreRef.current = ignore
      window.hermesDesktop?.petOverlay?.setIgnoreMouse(ignore)
    }
  }

  useEffect(() => {
    const off = window.hermesDesktop?.petOverlay?.onState(payload => {
      setPetInfo(payload.info)
      $petActivity.set(payload.activity ?? {})
      setBusy(Boolean(payload.busy))
      setAwaitingResponse(Boolean(payload.awaiting))
      setUnread(Boolean(payload.unread))
    })

    window.hermesDesktop?.petOverlay?.control({ type: 'ready' })

    return off
  }, [])

  useEffect(() => {
    setIgnore(true)

    const isInteractiveAt = (x: number, y: number): boolean => {
      const pet = petRef.current
      const target = document.elementFromPoint(x, y)

      if (!pet || !target || !pet.contains(target)) {
        return false
      }

      if (!(target instanceof HTMLCanvasElement)) {
        return true
      }

      const rect = target.getBoundingClientRect()

      if (rect.width === 0 || rect.height === 0) {
        return true
      }

      const ctx = target.getContext('2d')

      if (!ctx) {
        return true
      }

      const px = Math.floor((x - rect.left) * (target.width / rect.width))
      const py = Math.floor((y - rect.top) * (target.height / rect.height))

      try {
        return ctx.getImageData(px, py, 1, 1).data[3] >= ALPHA_HIT_THRESHOLD
      } catch {
        return true
      }
    }

    const onMove = (ev: MouseEvent) => {
      if (dragRef.current || composerOpenRef.current || menuOpenRef.current) {
        setIgnore(false)

        return
      }

      setIgnore(!isInteractiveAt(ev.clientX, ev.clientY))
    }

    window.addEventListener('mousemove', onMove)

    return () => {
      window.removeEventListener('mousemove', onMove)
      clearTimeout(clickTimerRef.current)
    }
  }, [])

  useEffect(() => {
    composerOpenRef.current = composerOpen
    menuOpenRef.current = menuOpen

    window.hermesDesktop?.petOverlay?.setFocusable(composerOpen || menuOpen)

    if (composerOpen || menuOpen) {
      setIgnore(false)
    }

    if (composerOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [composerOpen, menuOpen])

  const onPetPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) {
      return
    }

    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = {
      height: window.outerHeight,
      moved: false,
      offX: e.screenX - window.screenX,
      offY: e.screenY - window.screenY,
      startX: e.screenX,
      startY: e.screenY,
      width: window.outerWidth
    }
  }

  const onPetPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    if (Math.hypot(e.screenX - drag.startX, e.screenY - drag.startY) > CLICK_SLOP_PX) {
      drag.moved = true
    }

    window.hermesDesktop?.petOverlay?.setBounds({
      height: drag.height,
      width: drag.width,
      x: e.screenX - drag.offX,
      y: e.screenY - drag.offY
    })
  }

  const onPetPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current
    dragRef.current = null
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)

    if (!drag) {
      return
    }

    if (drag.moved) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = undefined

      window.hermesDesktop?.petOverlay?.control({
        bounds: { height: drag.height, width: drag.width, x: e.screenX - drag.offX, y: e.screenY - drag.offY },
        type: 'bounds'
      })

      return
    }

    if (e.shiftKey) {
      window.hermesDesktop?.petOverlay?.control({ type: 'pop-in' })

      return
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = undefined
      window.hermesDesktop?.petOverlay?.control({ type: 'toggle-app' })

      return
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = undefined
      setMenuOpen(false)
      setComposerOpen(open => !open)
    }, DOUBLE_CLICK_MS)
  }

  const send = () => {
    const text = draft.trim()

    if (text) {
      window.hermesDesktop?.petOverlay?.control({ text, type: 'submit' })
    }

    setDraft('')
    setComposerOpen(false)
    setMenuOpen(false)
  }

  const openApp = () => {
    setUnread(false)
    setMenuOpen(false)
    window.hermesDesktop?.petOverlay?.control({ type: 'open-app' })
  }

  const control = (type: PetMenuControl) => {
    setMenuOpen(false)

    if (type === 'open-journal' || type === 'open-settings' || type === 'open-skins') {
      setComposerOpen(false)
    }

    window.hermesDesktop?.petOverlay?.control({ type })
  }

  const openComposer = (seed = '') => {
    setSleeping(false)
    setMenuOpen(false)
    setComposerOpen(true)

    if (seed) {
      setDraft(seed)
    }
  }

  const statusLabel = sleeping
    ? 'sleeping'
    : quiet
      ? 'quiet'
      : activity.error
        ? 'snag'
        : activity.awaitingInput
          ? 'listening'
          : activity.busy || activity.reasoning || activity.toolRunning
            ? 'thinking'
            : 'safe mode'

  const onScale = useCallback((next: number, anchor: PetZoomAnchor) => {
    zoomAnchorRef.current = anchor
    setPetInfo({ ...$petInfo.get(), scale: next })
    window.hermesDesktop?.petOverlay?.control({ scale: next, type: 'scale' })
  }, [])

  usePetZoomGesture(petRef, onScale, Boolean(info.enabled && info.spritesheetBase64))

  useEffect(() => {
    if (!info.enabled || !info.spritesheetBase64) {
      return
    }

    const { width, height } = overlayWindowSize(
      info.frameW ?? DEFAULT_FRAME_W,
      info.frameH ?? DEFAULT_FRAME_H,
      info.scale ?? DEFAULT_SCALE
    )

    const curW = window.outerWidth
    const curH = window.outerHeight

    if (width === curW && height === curH) {
      zoomAnchorRef.current = null

      return
    }

    const anchor = zoomAnchorRef.current
    zoomAnchorRef.current = null
    const ratio = anchor?.ratio ?? 1
    const ax = anchor?.clientX ?? curW / 2
    const ay = anchor?.clientY ?? curH - PET_PADDING_BOTTOM

    const bounds = {
      height,
      width,
      x: Math.round(window.screenX + ax - (ax - curW / 2) * ratio - width / 2),
      y: Math.round(window.screenY + ay - (ay - (curH - PET_PADDING_BOTTOM)) * ratio - (height - PET_PADDING_BOTTOM))
    }

    window.hermesDesktop?.petOverlay?.setBounds(bounds)
    window.hermesDesktop?.petOverlay?.control({ bounds, type: 'bounds' })
  }, [info.enabled, info.spritesheetBase64, info.scale, info.frameW, info.frameH])

  if (!info.enabled || !info.spritesheetBase64) {
    return null
  }

  return (
    <div
      className="tb-pet-overlay"
      onPointerDown={e => {
        if ((composerOpen || menuOpen) && e.target === e.currentTarget) {
          setComposerOpen(false)
          setMenuOpen(false)
        }
      }}
    >
      <div
        className="tb-pet-stage"
        onContextMenu={e => {
          e.preventDefault()
          setComposerOpen(false)
          setMenuOpen(open => !open)
        }}
        onPointerDown={onPetPointerDown}
        onPointerMove={onPetPointerMove}
        onPointerUp={onPetPointerUp}
        ref={petRef}
      >
        {composerOpen && (
          <section
            aria-label="Talk to Trading Buddy"
            className="tb-pet-panel"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <div className="tb-pet-topbar">
              <span className="tb-pet-title">
                <PawPrint style={{ height: 15, width: 15 }} />
                Trading Buddy
              </span>
              <span className="tb-pet-status-pill">{statusLabel}</span>
            </div>
            <textarea
              className="tb-pet-textarea"
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                } else if (e.key === 'Escape') {
                  setComposerOpen(false)
                }
              }}
              placeholder="What are we thinking through?"
              ref={inputRef}
              value={draft}
            />
            <div className="tb-pet-quick-actions">
              <button
                className="tb-pet-button tb-pet-button--quiet"
                onClick={() => openComposer('Just listen. ')}
                type="button"
              >
                Listen
              </button>
              <button className="tb-pet-button" onClick={() => openComposer('Help me reflect on this: ')} type="button">
                Reflect
              </button>
              <button
                className="tb-pet-button"
                onClick={() => openComposer('Help me make a small plan for this: ')}
                type="button"
              >
                Plan
              </button>
              <button className="tb-pet-button tb-pet-button--skin" onClick={() => control('open-skins')} type="button">
                <Palette style={{ height: 13, width: 13 }} />
                Skins
              </button>
            </div>
            <div className="tb-pet-actions">
              <button className="tb-pet-button tb-pet-button--primary" onClick={send} type="button">
                Send
              </button>
              <button className="tb-pet-button" onClick={() => control('open-journal')} type="button">
                <NotebookTabs style={{ height: 13, width: 13 }} />
                Journal
              </button>
              <button className="tb-pet-button" onClick={() => setComposerOpen(false)} type="button">
                Close
              </button>
            </div>
          </section>
        )}

        {menuOpen && (
          <section
            aria-label="Trading Buddy pet menu"
            className="tb-pet-menu"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <div className="tb-pet-menu-title">
              <PawPrint style={{ height: 15, width: 15 }} />
              Buddy menu
            </div>
            <div className="tb-pet-menu-grid">
              <button className="tb-pet-menu-item" onClick={() => openComposer()} type="button">
                <MessageCircle style={{ height: 15, width: 15 }} />
                Talk
              </button>
              <button className="tb-pet-menu-item" onClick={() => control('open-skins')} type="button">
                <Palette style={{ height: 15, width: 15 }} />
                Change pet skin
              </button>
              <button className="tb-pet-menu-item" onClick={() => setMenuOpen(false)} type="button">
                <PawPrint style={{ height: 15, width: 15 }} />
                Sit here
              </button>
              <button
                className="tb-pet-menu-item"
                onClick={() => {
                  setQuiet(true)
                  setSleeping(false)
                  setComposerOpen(false)
                  setMenuOpen(false)
                }}
                type="button"
              >
                <Moon style={{ height: 15, width: 15 }} />
                Stay quiet
              </button>
              <button
                className="tb-pet-menu-item"
                onClick={() => {
                  setSleeping(true)
                  setQuiet(true)
                  setComposerOpen(false)
                  setMenuOpen(false)
                }}
                type="button"
              >
                <Moon style={{ height: 15, width: 15 }} />
                Sleep
              </button>
              <button
                className="tb-pet-menu-item"
                onClick={() => {
                  setSleeping(false)
                  setQuiet(false)
                  setMenuOpen(false)
                }}
                type="button"
              >
                <Sun style={{ height: 15, width: 15 }} />
                Wake up
              </button>
              <div className="tb-pet-menu-separator" />
              <button className="tb-pet-menu-item" onClick={() => control('bring-back')} type="button">
                <PawPrint style={{ height: 15, width: 15 }} />
                Bring Buddy Back
              </button>
              <button className="tb-pet-menu-item" onClick={openApp} type="button">
                <Monitor style={{ height: 15, width: 15 }} />
                Open Trading Buddy
              </button>
              <button className="tb-pet-menu-item" onClick={() => control('open-journal')} type="button">
                <NotebookTabs style={{ height: 15, width: 15 }} />
                Open Journal
              </button>
              <button className="tb-pet-menu-item" onClick={() => control('open-settings')} type="button">
                <Settings style={{ height: 15, width: 15 }} />
                Settings
              </button>
              <button className="tb-pet-menu-item" onClick={() => control('restart-buddy')} type="button">
                <RefreshCw style={{ height: 15, width: 15 }} />
                Restart Buddy
              </button>
              <button className="tb-pet-menu-item tb-pet-menu-danger" onClick={() => control('quit')} type="button">
                <X style={{ height: 15, width: 15 }} />
                Quit
              </button>
            </div>
          </section>
        )}

        <div className="tb-pet-status-wrap">
          <PetBubble />
        </div>
        <div className="tb-pet-sprite-wrap">
          <PetSprite info={info} />

          {unread && (
            <button
              aria-label="Open in Trading Buddy"
              className="tb-pet-button tb-pet-button--mail"
              onClick={openApp}
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
              title="Open in Trading Buddy"
              type="button"
            >
              <Mail style={{ height: 14, width: 14 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
