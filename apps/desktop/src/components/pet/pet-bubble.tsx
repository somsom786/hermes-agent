import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { AlertCircle, Clock, type IconComponent } from '@/lib/icons'
import { $petActivity, $petState, type PetState } from '@/store/pet'

type Tone = 'error' | 'wait'

interface Spec {
  lines: string[]
  glyph?: IconComponent
  tone?: Tone
}

const SPECS: Partial<Record<PetState, Spec>> = {
  thinking: {
    lines: ['thinking…', 'checking…', 'steady…', 'sorting it…']
  },
  talking: {
    lines: ['talking it through…', 'one thought…', 'here we go…']
  },
  writing: {
    lines: ['writing this down…', 'saving the thread…', 'journaling…']
  },
  listening: {
    glyph: Clock,
    lines: ['I’m listening', 'your turn', 'all yours', 'right here'],
    tone: 'wait'
  },
  concerned: {
    glyph: AlertCircle,
    lines: ['hit a snag', 'need a reset', 'one bump'],
    tone: 'error'
  },
  offline: {
    glyph: AlertCircle,
    lines: ['offline for now', 'can’t reach Hermes', 'connection nap'],
    tone: 'error'
  },
  run: {
    lines: ['with you…', 'thinking…', 'checking…', 'steady…', 'one sec…', 'sorting it…']
  },
  review: {
    lines: ['reflecting…', 'reading…', 'connecting dots…', 'zooming out…', 'hmm…']
  },
  failed: {
    glyph: AlertCircle,
    lines: ['hit a snag', 'offline-ish', 'need a reset', 'one bump'],
    tone: 'error'
  },
  waiting: {
    glyph: Clock,
    lines: ['I’m listening', 'your turn', 'all yours', 'right here'],
    tone: 'wait'
  }
}

const TONE_COLOR: Record<Tone, string> = {
  error: 'var(--tb-tomato, var(--ui-red))',
  wait: 'var(--tb-mustard, var(--ui-yellow))'
}

function pick(lines: string[], prev: string): string {
  if (lines.length <= 1) {
    return lines[0] ?? ''
  }

  let next = prev

  while (next === prev) {
    next = lines[Math.floor(Math.random() * lines.length)]
  }

  return next
}

export function PetBubble() {
  const state = useStore($petState)
  const activity = useStore($petActivity)
  const [line, setLine] = useState('')

  const specKey: null | PetState =
    state in SPECS ? state : state === 'idle' && activity.awaitingInput ? 'listening' : null

  const rotating = specKey === 'run' || specKey === 'review' || specKey === 'thinking' || specKey === 'talking'

  useEffect(() => {
    const spec = specKey ? SPECS[specKey] : null

    if (!spec) {
      setLine('')

      return
    }

    setLine(prev => pick(spec.lines, prev))

    if (!rotating || spec.lines.length <= 1) {
      return
    }

    const id = window.setInterval(() => setLine(prev => pick(spec.lines, prev)), 2600)

    return () => window.clearInterval(id)
  }, [specKey, rotating])

  const spec = specKey ? SPECS[specKey] : null

  if (!spec) {
    return null
  }

  const Glyph = spec.glyph
  const text = line || spec.lines[0]
  const hasText = Boolean(text)

  return (
    <div
      style={{
        alignItems: 'center',
        background:
          'linear-gradient(135deg, var(--tb-paper, var(--ui-bg-elevated)), var(--tb-cream, var(--ui-bg-elevated)))',
        border: '2px solid var(--tb-border, var(--ui-stroke-secondary))',
        borderRadius: hasText ? 14 : 999,
        boxShadow: '0 4px 0 rgba(51,36,23,0.16), 0 10px 22px rgba(0,0,0,0.18)',
        color: 'var(--tb-ink, var(--foreground))',
        display: 'inline-flex',
        fontSize: 11,
        fontWeight: 800,
        gap: hasText ? 5 : 0,
        lineHeight: 1,
        padding: hasText ? '6px 9px' : 5,
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      {Glyph && (
        <span style={{ display: 'inline-flex' }}>
          <Glyph style={{ color: spec.tone ? TONE_COLOR[spec.tone] : 'currentColor', height: 13, width: 13 }} />
        </span>
      )}
      {text}
    </div>
  )
}
