import type { GameApp } from '../core/app'
import type { Loop } from '../core/loop'
import { createBloom, type Bloom } from './bloom'
import { createParticles, type Particles } from './particles'
import { createShake, type Shake } from './shake'
import { createTweens, type Tweens } from './tween'
import { createScreenFx, type ScreenFx } from './screenfx'
import { createAudio, type Audio } from './audio'

export * from './palette'
export * from './bloom'
export * from './particles'
export * from './shake'
export * from './tween'
export * from './screenfx'
export * from './audio'

export interface Juice {
  bloom: Bloom
  particles: Particles
  shake: Shake
  tweens: Tweens
  screenfx: ScreenFx
  audio: Audio
}

/**
 * Svih sest modula odjednom. Postoji da scena ne prima sest parametara.
 *
 * U igri se raspakira na mjestu upotrebe, pa se dobije terse API iz
 * specifikacije bez skrivenog globalnog stanja:
 *
 *   const { punch, after } = juice.tweens
 *   punch(sprite)
 */
export function createJuice(app: GameApp, loop: Loop): Juice {
  return {
    bloom: createBloom(app.world),
    particles: createParticles(app, loop),
    shake: createShake(app.world, loop),
    tweens: createTweens(loop),
    screenfx: createScreenFx(app, loop),
    audio: createAudio(),
  }
}
