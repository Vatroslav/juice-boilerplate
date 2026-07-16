import { AdvancedBloomFilter } from 'pixi-filters'
import { Rectangle, type Container } from 'pixi.js'
import { WIDTH, HEIGHT } from '../core/app'

/**
 * Polaziste za tuning, ne dogma. Podesava se uzivo u playgroundu (strelice),
 * pa se vrijednost koja prezivi prepise ovdje.
 */
export const BLOOM_DEFAULTS = {
  threshold: 0.4,
  bloomScale: 1.2,
  brightness: 1.0,
  blur: 8,
  quality: 5,
}

export interface Bloom {
  /** Referenca na filter - playground ga tuna uzivo, bez rebuilda. */
  readonly filter: AdvancedBloomFilter
  enabled: boolean
}

/**
 * Bloom ide na `world`, nikad na `ui`. HUD kroz bloom postane kasa.
 *
 * Sto svijetli bira se odabirom boje iz palete (`bright` varijanta je iznad
 * thresholda, `base` ispod), ne diranjem filtera.
 */
export function createBloom(world: Container): Bloom {
  const filter = new AdvancedBloomFilter({ ...BLOOM_DEFAULTS })

  // Bez ovoga Pixi svaki frame racuna bounds sadrzaja worlda i mijenja velicinu
  // filter teksture kako se oblici krecu. Rect je u LOKALNIM koordinatama, pa
  // screenshake nosi i njega - ostaje poravnat sa sadrzajem.
  world.filterArea = new Rectangle(0, 0, WIDTH, HEIGHT)

  let enabled = true
  world.filters = [filter]

  return {
    filter,
    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      world.filters = value ? [filter] : []
    },
  }
}
