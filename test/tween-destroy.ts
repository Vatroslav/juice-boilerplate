/**
 * Zasto ovaj test postoji, a ostatak templatea nema testove:
 *
 * Pixi trazi sljedeci frame TEK NAKON sto update prode. Ako update baci
 * iznimku, `requestAnimationFrame` se preskoci i ticker se vise nikad ne
 * zakaze - igra je mrtva, bez poruke, bez oporavka. Jedan zaboravljeni tween na
 * unistenom objektu je dovoljan.
 *
 * Na jamu u tri ujutro je to najskuplji mogucí kvar, a najlaksi za slucajno
 * vratiti - dovoljno je maknuti cetiri linije iz `step()`. Zato test.
 *
 * Pokretanje: `npm test` (goli node, bez ijedne ovisnosti).
 */

import { createTweens } from '../src/juice/tween.ts'

type Fn = (dt: number) => void

function fakeLoop() {
  const scaled: Fn[] = []
  const unscaled: Fn[] = []
  return {
    loop: {
      timeScale: 1,
      add(fn: Fn, opts?: { unscaled?: boolean }) {
        ;(opts?.unscaled === true ? unscaled : scaled).push(fn)
        return () => {}
      },
      addLate() {
        return () => {}
      },
    },
    tick(dt: number) {
      for (const fn of [...scaled]) fn(dt)
      for (const fn of [...unscaled]) fn(dt)
    },
  }
}

/**
 * Oponasa Pixi Container: `destroy()` postavi `_scale = null`, pa getter vrati
 * null i svako daljnje pisanje baci TypeError. Provjereno u
 * node_modules/pixi.js/lib/scene/container/Container.mjs.
 */
function fakePixiObject() {
  let scaleRef: { x: number; y: number } | null = { x: 1, y: 1 }
  return {
    destroyed: false,
    get scale() {
      return scaleRef as { x: number; y: number }
    },
    destroy() {
      this.destroyed = true
      scaleRef = null
    },
  }
}

let failures = 0

function check(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`  ok    ${name}`)
  } catch (err) {
    failures++
    console.log(`  PUKLO ${name}`)
    console.log(`        ${(err as Error).message}`)
  }
}

console.log('\nMeta umre usred animacije - svaki od ovih bi bez zastite zaledio igru:\n')

check('punch', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  tweens.punch(obj, 0.5, 0.4)
  tick(0.1)
  obj.destroy()
  tick(0.1)
  tick(0.1)
})

check('scaleTo', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  obj.scale.x = 0
  obj.scale.y = 0
  tweens.scaleTo(obj, 1, 0.35, { ease: 'backOut' })
  tick(0.1)
  obj.destroy()
  tick(0.1)
})

check('tween na proizvoljnom svojstvu', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = Object.assign(fakePixiObject(), { alpha: 1 })
  tweens.tween(obj, { alpha: 0 }, 0.3)
  tick(0.1)
  obj.destroy()
  tick(0.1)
})

check('flush() - gasenje tweena dok je mrtva meta u listi', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  tweens.punch(obj, 0.5, 0.4)
  tick(0.1)
  obj.destroy()
  tweens.enabled = false
})

check('onDone - meta umre pred sam kraj animacije', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  tweens.punch(obj, 0.5, 0.4)
  tick(0.39)
  obj.destroy()
  tick(0.1)
})

console.log('\nZiva meta - normalno ponasanje mora ostati netaknuto:\n')

check('punch se vrati tocno na bazu', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  tweens.punch(obj, 0.5, 0.4)
  tick(0.5)
  if (obj.scale.x !== 1) throw new Error(`scale.x je ${obj.scale.x}, ocekivano 1`)
})

check('scaleTo dode tocno do cilja', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const obj = fakePixiObject()
  obj.scale.x = 0
  obj.scale.y = 0
  tweens.scaleTo(obj, 1, 0.35)
  tick(0.4)
  if (obj.scale.x !== 1) throw new Error(`scale.x je ${obj.scale.x}, ocekivano 1`)
})

check('obican objekt (nema `destroyed`) se tweena normalno', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  const plain = { v: 0 }
  tweens.tween(plain, { v: 10 }, 0.2, { ease: 'linear' })
  tick(0.3)
  if (plain.v !== 10) throw new Error(`v je ${plain.v}, ocekivano 10`)
})

check('after() tajmer okine normalno', () => {
  const { loop, tick } = fakeLoop()
  const tweens = createTweens(loop)
  let fired = false
  tweens.after(0.1, () => {
    fired = true
  })
  tick(0.2)
  if (!fired) throw new Error('tajmer nije okinuo')
})

// Iznimka umjesto process.exit: node svejedno izade s kodom 1, a ne treba
// @types/node - nova ovisnost bi bila odluka, a ovo je jedan `throw`.
if (failures > 0) {
  throw new Error(`${failures} testova palo`)
}
console.log('\nsve prolazi\n')
