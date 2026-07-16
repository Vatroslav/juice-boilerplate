import type { Container } from 'pixi.js'
import { WIDTH, HEIGHT } from '../core/app'
import type { Loop } from '../core/loop'

/** Koliko trauma padne po sekundi. */
const DECAY = 1.5
const MAX_OFFSET = 16
const MAX_ROTATION = 0.015
/** Brzina titranja. */
const FREQUENCY = 18

export interface Shake {
  /** amount 0..1. Tipicno: 0.2 na hit, 0.6 na eksploziju. */
  add(amount: number): void
  enabled: boolean
  readonly trauma: number
}

/**
 * Zbroj dvaju sinusa umjesto Math.random() po frameu. Random izgleda zrnato i
 * "buzzy"; ovo je glatko, deterministicno i jednako jeftino.
 */
function noise(t: number, seed: number): number {
  return (Math.sin(t * 12.9898 + seed) + Math.sin(t * 31.7 + seed * 2.3)) * 0.5
}

/**
 * Trauma model iz GDC talka "Math for Game Programmers: Juicing Your Cameras".
 * Ide na `world`, nikad na `ui` - HUD se ne trese.
 */
export function createShake(world: Container, loop: Loop): Shake {
  // Pivot u sredinu da se rotacija vrti oko centra ekrana, a ne oko gornjeg
  // lijevog kuta. Pivot i position se medusobno ponistavaju, pa gameplay
  // koordinate ostaju netaknute - i dalje je (0,0) gornji lijevi kut.
  world.pivot.set(WIDTH / 2, HEIGHT / 2)
  world.position.set(WIDTH / 2, HEIGHT / 2)

  let trauma = 0
  let elapsed = 0
  let enabled = true

  function neutral(): void {
    world.position.set(WIDTH / 2, HEIGHT / 2)
    world.rotation = 0
  }

  loop.add((dt) => {
    if (!enabled || trauma <= 0) return

    elapsed += dt
    trauma = Math.max(0, trauma - DECAY * dt)
    if (trauma <= 0) {
      neutral()
      return
    }

    // Offset skalira s trauma², ne s traumom. Kvadrat je ono sto ovo cini
    // dobrim: mali hitovi jedva mrdnu, veliki tresu.
    const magnitude = trauma * trauma
    const t = elapsed * FREQUENCY

    world.position.set(
      WIDTH / 2 + noise(t, 0) * MAX_OFFSET * magnitude,
      HEIGHT / 2 + noise(t, 5.2) * MAX_OFFSET * magnitude,
    )
    world.rotation = noise(t, 9.7) * MAX_ROTATION * magnitude
  })

  return {
    add(amount: number) {
      if (!enabled) return
      trauma = Math.min(1, trauma + amount)
    },

    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      if (!value) {
        trauma = 0
        neutral()
      }
    },

    get trauma() {
      return trauma
    },
  }
}
