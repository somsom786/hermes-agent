import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PetOverlayControl } from './pet-overlay'

type ControlCallback = (payload: PetOverlayControl) => void

describe('pet overlay bridge menu routing', () => {
  let controlCallback: ControlCallback | null

  beforeEach(() => {
    vi.resetModules()
    controlCallback = null

    Object.defineProperty(window, 'hermesDesktop', {
      configurable: true,
      value: {
        brand: { companionMode: true },
        petOverlay: {
          close: vi.fn(),
          control: vi.fn(),
          onControl: vi.fn((callback: ControlCallback) => {
            controlCallback = callback

            return vi.fn()
          }),
          onState: vi.fn(),
          open: vi.fn(),
          pushState: vi.fn(),
          setBounds: vi.fn(),
          setFocusable: vi.fn(),
          setIgnoreMouse: vi.fn()
        }
      } as unknown as NonNullable<typeof window.hermesDesktop>
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('routes buddy menu requests to the registered main-window handlers', async () => {
    const {
      initPetOverlayBridge,
      setPetOverlayOpenJournalHandler,
      setPetOverlayOpenSettingsHandler,
      setPetOverlayOpenSkinsHandler
    } = await import('./pet-overlay')

    const openSkins = vi.fn()
    const openJournal = vi.fn()
    const openSettings = vi.fn()

    setPetOverlayOpenSkinsHandler(openSkins)
    setPetOverlayOpenJournalHandler(openJournal)
    setPetOverlayOpenSettingsHandler(openSettings)

    const dispose = initPetOverlayBridge()

    controlCallback?.({ type: 'open-skins' })
    controlCallback?.({ type: 'open-journal' })
    controlCallback?.({ type: 'open-settings' })

    expect(openSkins).toHaveBeenCalledOnce()
    expect(openJournal).toHaveBeenCalledOnce()
    expect(openSettings).toHaveBeenCalledOnce()

    dispose()
  })
})
