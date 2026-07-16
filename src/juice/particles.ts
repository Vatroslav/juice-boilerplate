import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { GameApp } from '../core/app'
import type { Loop } from '../core/loop'
import { technical } from './palette'

export const TAU = Math.PI * 2

/** Jam igra ne smije umrijeti od konfeta - visak se tiho ignorira. */
const POOL_CAP = 2000

/** Polumjer generirane teksture. Cestica se skalira na svoj `size` iz ovoga. */
const TEXTURE_RADIUS = 8

export type Range = [number, number]

export interface BurstOpts {
  x: number
  y: number
  /** Uzeti iz palete. `bright` varijanta glowa kroz bloom, `base` ne. */
  color: number
  count?: number
  speed?: Range
  life?: Range
  /** Polumjer cestice u pikselima. */
  size?: Range
  /** Kut rasipanja oko `direction`. TAU = na sve strane. */
  spread?: number
  /** Srednji kut izbacivanja, u radijanima. Bitno tek kad je `spread` < TAU. */
  direction?: number
  /** Piksela po sekundi na kvadrat, prema dolje. */
  gravity?: number
  /**
   * Udio brzine zadrzan nakon jedne sekunde (0..1). 1 = bez otpora.
   * Namjerno po sekundi, ne po frameu - inace izgled ovisi o frameratu.
   */
  drag?: number
}

export interface EmitterOpts extends Omit<BurstOpts, 'x' | 'y' | 'count'> {
  /** Zove se svaki frame - trail prati zivu metu, ne mrtvu kopiju koordinata. */
  follow: () => { x: number; y: number }
  /** Cestica po sekundi. */
  rate: number
}

export interface Emitter {
  stop(): void
}

export interface Particles {
  /** Udarac, eksplozija, pickup. */
  burst(opts: BurstOpts): void
  /** Trail iza igraca ili projektila. */
  emitter(opts: EmitterOpts): Emitter
  enabled: boolean
  readonly active: number
  clear(): void
}

interface Particle {
  sprite: Sprite
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  gravity: number
  drag: number
  active: boolean
}

interface LiveEmitter {
  opts: EmitterOpts
  carry: number
  stopped: boolean
}

function pick(range: Range): number {
  const [min, max] = range
  return min + Math.random() * (max - min)
}

export function createParticles(app: GameApp, loop: Loop): Particles {
  // Jedna bijela tekstura, tint po cestici - nula asseta.
  const shape = new Graphics().circle(0, 0, TEXTURE_RADIUS).fill({ color: technical.tintBase })
  const texture: Texture = app.pixi.renderer.generateTexture({
    target: shape,
    resolution: 2,
    antialias: true,
  })
  shape.destroy()

  const container = new Container()
  // Cestice idu iznad scene, a scene se dodaju u world dinamicki - zato zIndex,
  // ne redoslijed dodavanja.
  app.world.sortableChildren = true
  container.zIndex = 10
  app.world.addChild(container)

  const pool: Particle[] = []
  const free: Particle[] = []
  const emitters: LiveEmitter[] = []
  let enabled = true
  let activeCount = 0

  function obtain(): Particle | null {
    const reused = free.pop()
    if (reused !== undefined) return reused
    if (pool.length >= POOL_CAP) return null // cap dosegnut - tiho odustani

    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.visible = false
    container.addChild(sprite)

    const particle: Particle = {
      sprite,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      gravity: 0,
      drag: 1,
      active: false,
    }
    pool.push(particle)
    return particle
  }

  function release(particle: Particle): void {
    particle.active = false
    particle.sprite.visible = false
    free.push(particle)
    activeCount--
  }

  function spawn(x: number, y: number, opts: BurstOpts): void {
    const particle = obtain()
    if (particle === null) return

    const speed = pick(opts.speed ?? [60, 260])
    const spread = opts.spread ?? TAU
    const direction = opts.direction ?? 0
    const angle = direction + (Math.random() - 0.5) * spread
    const life = pick(opts.life ?? [0.3, 0.8])
    const size = pick(opts.size ?? [2, 5])

    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed
    particle.life = life
    particle.maxLife = life
    particle.size = size
    particle.gravity = opts.gravity ?? 0
    particle.drag = opts.drag ?? 0.9
    particle.active = true

    particle.sprite.visible = true
    particle.sprite.tint = opts.color
    particle.sprite.alpha = 1
    particle.sprite.position.set(x, y)
    particle.sprite.scale.set(size / TEXTURE_RADIUS)

    activeCount++
  }

  loop.add((dt) => {
    if (!enabled) return

    for (const emitter of emitters) {
      if (emitter.stopped) continue
      emitter.carry += emitter.opts.rate * dt
      const count = Math.floor(emitter.carry)
      emitter.carry -= count
      if (count <= 0) continue
      const at = emitter.opts.follow()
      for (let i = 0; i < count; i++) {
        spawn(at.x, at.y, { ...emitter.opts, x: at.x, y: at.y })
      }
    }

    for (const particle of pool) {
      if (!particle.active) continue

      particle.life -= dt
      if (particle.life <= 0) {
        release(particle)
        continue
      }

      const retained = particle.drag ** dt
      particle.vx *= retained
      particle.vy *= retained
      particle.vy += particle.gravity * dt

      particle.sprite.x += particle.vx * dt
      particle.sprite.y += particle.vy * dt

      // Fade i shrink prema kraju zivota - to je razlika izmedu konfeta i dima.
      const remaining = particle.life / particle.maxLife
      particle.sprite.alpha = remaining
      particle.sprite.scale.set((particle.size * remaining) / TEXTURE_RADIUS)
    }
  })

  function clear(): void {
    for (const particle of pool) {
      if (particle.active) release(particle)
    }
  }

  return {
    burst(opts: BurstOpts) {
      if (!enabled) return
      const count = opts.count ?? 20
      for (let i = 0; i < count; i++) spawn(opts.x, opts.y, opts)
    },

    emitter(opts: EmitterOpts) {
      const live: LiveEmitter = { opts, carry: 0, stopped: false }
      emitters.push(live)
      return {
        stop() {
          live.stopped = true
          const i = emitters.indexOf(live)
          if (i >= 0) emitters.splice(i, 1)
        },
      }
    },

    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      if (!value) clear()
    },

    get active() {
      return activeCount
    },

    clear,
  }
}
