import type { Loop } from '../core/loop'

export type EaseName = 'linear' | 'quadOut' | 'quadInOut' | 'cubicOut' | 'backOut' | 'elasticOut'

/**
 * Sest komada, ne biblioteka. `backOut` i `elasticOut` nose vecinu juicinessa -
 * ostali su tu da postoji izbor kad overshoot ne valja.
 */
export const eases: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  cubicOut: (t) => 1 - (1 - t) ** 3,
  backOut: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

export interface TweenHandle {
  cancel(): void
}

export interface TweenOpts {
  ease?: EaseName
  delay?: number
  /** Ignorira `loop.timeScale` - tece i dok je svijet zamrznut hitstopom. */
  unscaled?: boolean
  onDone?: () => void
}

/** Samo brojcana svojstva mete smiju biti tweenana. */
type NumberKeys<T> = { [K in keyof T]-?: T[K] extends number ? K : never }[keyof T]
export type TweenTo<T> = { [K in NumberKeys<T>]?: number }

/** Meta za `punch` - sve sto ima scale (Container, Sprite, Graphics). */
export interface Scalable {
  scale: { x: number; y: number }
}

export interface Tweens {
  tween<T extends object>(target: T, to: TweenTo<T>, duration: number, opts?: TweenOpts): TweenHandle
  /** Scale pop - najcesci juice poziv u praksi. */
  punch(target: Scalable, amount?: number, duration?: number): TweenHandle
  /**
   * Scale od trenutnog do zadanog. Meta je OBJEKT, ne njegov `scale` point -
   * zato sto se tween tada zna sam odbaciti kad objekt umre (vidi `isDestroyed`).
   * `tween(sprite.scale, { x: 0 })` bi radio isto, ali bi promasio tu zastitu.
   */
  scaleTo(target: Scalable, to: number, duration: number, opts?: TweenOpts): TweenHandle
  /** Tajmer kroz loop - postuje timeScale, pa hitstop odgada i njega. */
  after(delay: number, fn: () => void, opts?: { unscaled?: boolean }): TweenHandle
  /**
   * Kad se ugasi, tweenovi skacu na krajnju vrijednost umjesto da animiraju -
   * stanje zavrsi tocno gdje treba, samo bez easinga. `punch` postaje no-op jer
   * je cista dekoracija. `after` nije pogoden - tajmer nije juice.
   */
  enabled: boolean
  readonly active: number
}

interface Entry {
  /** Objekt u koji `apply` pise. Cuva se samo da se zna je li jos ziv. */
  target: object
  elapsed: number
  delay: number
  duration: number
  ease: (t: number) => number
  apply: (progress: number) => void
  onDone: (() => void) | undefined
  /** Tajmer (`after`), ne animacija - gasenje sustava ga ne smije okinuti. */
  timer: boolean
}

const NOOP_HANDLE: TweenHandle = { cancel() {} }

/** Tajmeri nemaju metu, a `{}` nikad nije unisten. */
const NO_TARGET: object = {}

/**
 * Pixi na `destroy()` postavi `_scale = null`, pa getter `scale` vrati null i
 * svako daljnje pisanje baci iznimku. Iznimka iz update-a zaledi CIJELU igru:
 * Pixi trazi sljedeci frame tek nakon sto update prode, pa se ticker nikad vise
 * ne zakaze. Jedan zaboravljeni tween na mrtvom objektu = crn ekran.
 *
 * Obicni objekti nemaju `destroyed`, pa im se ponasanje ovim ne mijenja.
 */
function isDestroyed(target: object): boolean {
  return (target as { destroyed?: boolean }).destroyed === true
}

export function createTweens(loop: Loop): Tweens {
  const scaledList: Entry[] = []
  const unscaledList: Entry[] = []
  let enabled = true

  function step(list: Entry[], dt: number): void {
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i]
      if (entry === undefined) continue

      // Meta je umrla dok je tween tekao - tiho odbaci, bez onDone (onDone bi
      // isto pisao u mrtav objekt).
      if (isDestroyed(entry.target)) {
        list.splice(i, 1)
        continue
      }

      entry.elapsed += dt
      if (entry.elapsed < entry.delay) continue

      const raw = entry.duration <= 0 ? 1 : Math.min((entry.elapsed - entry.delay) / entry.duration, 1)
      entry.apply(entry.ease(raw))

      if (raw >= 1) {
        list.splice(i, 1)
        entry.onDone?.()
      }
    }
  }

  /**
   * Ugasen sustav: animacije koje teku dovrse se odmah, da "sve off" bude odmah
   * sterilno. Tajmeri se NE diraju - okinuti ih prije vremena nije "bez
   * easinga", nego promjena logike igre.
   */
  function flush(list: Entry[]): void {
    const animations = list.filter((entry) => !entry.timer)
    for (const entry of animations) {
      const i = list.indexOf(entry)
      if (i >= 0) list.splice(i, 1)
      // Isti razlog kao u step(): apply(1) na mrtvoj meti zaledi igru. Gasenje
      // tweena tipkom [4] bi inace bilo drugi put do istog crnog ekrana.
      if (isDestroyed(entry.target)) continue
      entry.apply(1)
      entry.onDone?.()
    }
  }

  loop.add((dt) => step(scaledList, dt))
  loop.add((dt) => step(unscaledList, dt), { unscaled: true })

  function attach(entry: Entry, unscaled: boolean): TweenHandle {
    const list = unscaled ? unscaledList : scaledList
    list.push(entry)
    return {
      cancel() {
        const i = list.indexOf(entry)
        if (i >= 0) list.splice(i, 1)
      },
    }
  }

  return {
    tween<T extends object>(target: T, to: TweenTo<T>, duration: number, opts: TweenOpts = {}): TweenHandle {
      // Dinamicki pristup po kljucu - TS ne moze pratiti tip kroz string index,
      // a `to` je vec suzen na brojcana svojstva kroz TweenTo<T>.
      const props = target as unknown as Record<string, number>
      const goals = to as Record<string, number>
      const keys = Object.keys(goals)
      const from: Record<string, number> = {}
      for (const key of keys) from[key] = props[key] as number

      const apply = (progress: number): void => {
        for (const key of keys) {
          const start = from[key] as number
          const end = goals[key] as number
          props[key] = start + (end - start) * progress
        }
      }

      if (!enabled) {
        apply(1)
        opts.onDone?.()
        return NOOP_HANDLE
      }

      return attach(
        {
          target,
          elapsed: 0,
          delay: opts.delay ?? 0,
          duration,
          ease: eases[opts.ease ?? 'quadOut'],
          apply,
          onDone: opts.onDone,
          timer: false,
        },
        opts.unscaled ?? false,
      )
    },

    scaleTo(target: Scalable, to: number, duration: number, opts: TweenOpts = {}): TweenHandle {
      const fromX = target.scale.x
      const fromY = target.scale.y

      const apply = (progress: number): void => {
        target.scale.x = fromX + (to - fromX) * progress
        target.scale.y = fromY + (to - fromY) * progress
      }

      if (!enabled) {
        apply(1)
        opts.onDone?.()
        return NOOP_HANDLE
      }

      return attach(
        {
          target,
          elapsed: 0,
          delay: opts.delay ?? 0,
          duration,
          ease: eases[opts.ease ?? 'quadOut'],
          apply,
          onDone: opts.onDone,
          timer: false,
        },
        opts.unscaled ?? false,
      )
    },

    punch(target: Scalable, amount = 0.3, duration = 0.25): TweenHandle {
      if (!enabled) return NOOP_HANDLE

      const baseX = target.scale.x
      const baseY = target.scale.y

      // Skok na (1 + amount) pa elasticOut natrag na 1. Progres ide 0→1 s
      // titrajem, pa faktor titra oko baze - to je pop.
      const apply = (progress: number): void => {
        const factor = 1 + amount * (1 - progress)
        target.scale.x = baseX * factor
        target.scale.y = baseY * factor
      }
      apply(0)

      return attach(
        {
          target,
          elapsed: 0,
          delay: 0,
          duration,
          ease: eases.elasticOut,
          apply,
          onDone: () => {
            target.scale.x = baseX
            target.scale.y = baseY
          },
          timer: false,
        },
        false,
      )
    },

    after(delay: number, fn: () => void, opts: { unscaled?: boolean } = {}): TweenHandle {
      return attach(
        {
          target: NO_TARGET,
          elapsed: 0,
          delay,
          duration: 0,
          ease: eases.linear,
          apply: () => {},
          onDone: fn,
          timer: true,
        },
        opts.unscaled ?? false,
      )
    },

    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      if (!value) {
        flush(scaledList)
        flush(unscaledList)
      }
    },

    get active() {
      return scaledList.length + unscaledList.length
    },
  }
}
