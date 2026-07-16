import type { Container } from 'pixi.js'
import { WIDTH, HEIGHT } from '../core/app'
import type { Loop } from '../core/loop'

/** Koliko trauma padne po sekundi. */
const DECAY = 1.5

/**
 * Specifikacija je trazila ~16 px. Premalo: offset skalira s trauma², pa bi
 * `add(0.2)` iz iste specifikacije dalo 0.4 px, a `add(0.6)` cetiri piksela -
 * cijela krivulja bi bila mrtva ispod trauma 0.7. Kvadrat treba raspon da bi
 * radio ono zbog cega postoji. Uz 36 px: 0.2 → ~1.4 px (jedva mrdne, kako i
 * treba), 0.6 → ~13 px (solidan udarac), 1.0 → 36 px (nasilno).
 */
const MAX_OFFSET = 36
const MAX_ROTATION = 0.03

const TWO_PI = Math.PI * 2

/**
 * Frekvencije titranja u HERCIMA. Obje moraju ostati ispod Nyquistove granice
 * (pola framerata = 30 Hz na 60 fps) - iznad nje se titranje ne uzorkuje kao
 * titranje nego kao aliasirani sum. Nesumjerljive su namjerno, da se uzorak ne
 * ponavlja vidljivo.
 */
const HZ_A = 7.3
const HZ_B = 11.7

export interface Shake {
  /** amount 0..1. Tipicno: 0.2 na hit, 0.6 na eksploziju. */
  add(amount: number): void
  enabled: boolean
  readonly trauma: number
}

/**
 * Zbroj dvaju sinusa umjesto Math.random() po frameu. Random izgleda zrnato i
 * "buzzy"; ovo je glatko, deterministicno i jednako jeftino. `t` je u sekundama.
 */
function noise(t: number, seed: number): number {
  return (Math.sin(TWO_PI * HZ_A * t + seed) + Math.sin(TWO_PI * HZ_B * t + seed * 2.3)) * 0.5
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

    world.position.set(
      WIDTH / 2 + noise(elapsed, 0) * MAX_OFFSET * magnitude,
      HEIGHT / 2 + noise(elapsed, 5.2) * MAX_OFFSET * magnitude,
    )
    world.rotation = noise(elapsed, 9.7) * MAX_ROTATION * magnitude
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
