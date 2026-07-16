import { Graphics } from 'pixi.js'
import { WIDTH, HEIGHT, type GameApp } from '../core/app'
import type { Loop } from '../core/loop'
import { palette, technical } from './palette'

export interface ScreenFx {
  /** Fullscreen bljesak pa fade. Default boja je ink; za stetu poslati akcent. */
  flash(color?: number, duration?: number, alpha?: number): void
  /** timeScale na 0 pa natrag. Najjeftiniji "weight" koji postoji. */
  hitstop(duration?: number): void
  enabled: boolean
}

export function createScreenFx(app: GameApp, loop: Loop): ScreenFx {
  // Overlay ide na `ui`, iznad svega - i namjerno izvan blooma.
  const overlay = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: technical.tintBase })
  overlay.alpha = 0
  overlay.zIndex = 100
  app.ui.sortableChildren = true
  app.ui.addChild(overlay)

  let flashRemaining = 0
  let flashDuration = 0
  let flashAlpha = 0
  let stopRemaining = 0
  let enabled = true

  // OBOJE mora biti unscaled. Flash zato sto mora zavrsiti i dok je svijet
  // zamrznut. Hitstop zato sto se sam odmrzava: da se odbrojava skaliranim dt-om,
  // timeScale 0 bi mu dao dt 0 i igra bi ostala zaledena zauvijek.
  loop.add(
    (dt) => {
      if (flashRemaining > 0) {
        flashRemaining -= dt
        overlay.alpha = flashRemaining > 0 ? flashAlpha * (flashRemaining / flashDuration) : 0
      }

      if (stopRemaining > 0) {
        stopRemaining -= dt
        if (stopRemaining <= 0) loop.timeScale = 1
      }
    },
    { unscaled: true },
  )

  return {
    flash(color = palette.ink, duration = 0.08, alpha = 0.6) {
      if (!enabled) return
      overlay.tint = color
      flashDuration = duration
      flashRemaining = duration
      flashAlpha = alpha
      overlay.alpha = alpha
    },

    hitstop(duration = 0.05) {
      if (!enabled) return
      // Vise hitova u istom frameu: vrijedi najduzi, ne zbroj.
      stopRemaining = Math.max(stopRemaining, duration)
      loop.timeScale = 0
    },

    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      if (!value) {
        flashRemaining = 0
        overlay.alpha = 0
        stopRemaining = 0
        loop.timeScale = 1
      }
    },
  }
}
