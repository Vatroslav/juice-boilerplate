import type { Application } from 'pixi.js'

export type UpdateFn = (dt: number) => void

/**
 * Gornja granica jednog framea. Tab-switch proizvede ogroman deltaMS; bez clampa
 * igra na povratak teleportira sve za pola ekrana.
 */
const MAX_DT = 1 / 30

export interface Loop {
  /**
   * Mnozi dt prije dispatcha. Mehanizam za hitstop: 0 = svijet zamrznut.
   * Pretplatnici s `unscaled: true` ga ignoriraju.
   */
  timeScale: number
  /** @returns funkcija za odjavu. */
  add(fn: UpdateFn, opts?: { unscaled?: boolean }): () => void
  /** Pretplata koja se izvrsava zadnja u frameu (npr. ciscenje inputa). */
  addLate(fn: UpdateFn): () => void
}

export function createLoop(pixi: Application): Loop {
  const scaled: UpdateFn[] = []
  const unscaled: UpdateFn[] = []
  const late: UpdateFn[] = []

  const loop: Loop = {
    timeScale: 1,
    add(fn: UpdateFn, opts?: { unscaled?: boolean }) {
      const list = opts?.unscaled === true ? unscaled : scaled
      list.push(fn)
      return () => detach(list, fn)
    },
    addLate(fn: UpdateFn) {
      late.push(fn)
      return () => detach(late, fn)
    },
  }

  pixi.ticker.add((ticker) => {
    // dt u SEKUNDAMA, clampan prije mnozenja s timeScale.
    const dt = Math.min(ticker.deltaMS / 1000, MAX_DT)
    const scaledDt = dt * loop.timeScale

    // Kopije: pretplatnik se smije odjaviti usred svog update-a.
    for (const fn of [...scaled]) fn(scaledDt)
    for (const fn of [...unscaled]) fn(dt)
    for (const fn of [...late]) fn(dt)
  })

  return loop
}

function detach(list: UpdateFn[], fn: UpdateFn): void {
  const i = list.indexOf(fn)
  if (i >= 0) list.splice(i, 1)
}
