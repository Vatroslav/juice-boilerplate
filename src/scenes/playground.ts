import { Container, Graphics, Text } from 'pixi.js'
import type { Scene } from '../core/scene'
import type { Input } from '../core/input'
import { WIDTH, HEIGHT, type GameApp } from '../core/app'
import {
  palette,
  randomAccent,
  TAU,
  type AccentName,
  type Emitter,
  type Juice,
  type TweenHandle,
} from '../juice'

/**
 * Playground - acceptance test, ne demo za druge.
 *
 * Ovo je alat kojim se presuduje "izgleda li mi dobro". Tipke 1-6 pale i gase
 * svaki sustav zasebno, 0 je sve off naspram sve on - razlika izmedu ta dva je
 * cijeli argument ovog projekta, vidljiv u jednom pritisku.
 */

const SHAPE_COUNT = 10

/**
 * Bilo je 140 px, sto je pokrivalo 12% ekrana - prosjecno 1.1 susjeda, a 32%
 * klikova nije punchnulo nista. Tween tako nije imao sto pokazati. 280 px
 * pokriva pola ekrana, oko 4 susjeda po kliku.
 */
const NEIGHBOUR_RADIUS = 280

/** Piksela po sekundi kojom val punch-a putuje od mjesta udarca. */
const RIPPLE_SPEED = 700

const RESPAWN_DELAY = 0.6

/**
 * Cestica po sekundi po trailu. Deset oblika × 55/s × zivot ~0.55s drzi oko
 * 300-500 aktivnih cestica - tocno raspon u kojem se mjeri fps iz definicije
 * gotovog.
 */
const TRAIL_RATE = 55

/** Brzina live tuninga blooma, u jedinicama po sekundi drzanja tipke. */
const THRESHOLD_RATE = 0.3
const SCALE_RATE = 0.8

interface Shape {
  gfx: Graphics
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  accent: AccentName
  anim: TweenHandle | null
  trail: Emitter | null
}

function spawnShape(): Shape {
  const accent = randomAccent()
  const radius = 14 + Math.random() * 18
  const color = palette.accent[accent].bright
  const gfx = new Graphics()

  if (Math.random() < 0.5) {
    gfx.circle(0, 0, radius).fill({ color })
  } else {
    gfx.rect(-radius, -radius, radius * 2, radius * 2).fill({ color })
  }

  const angle = Math.random() * TAU
  const speed = 80 + Math.random() * 120

  return {
    gfx,
    x: radius + Math.random() * (WIDTH - radius * 2),
    y: radius + Math.random() * (HEIGHT - radius * 2),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    accent,
    anim: null,
    trail: null,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Zvuk sintetiziran u kodu - template nema nijedan asset (jam pravila o
 * unaprijed pripremljenim assetima). Ide kroz isti audio.play() put kao pravi
 * .wav, pa se pitch jitter i mute normalno testiraju.
 */
function synthBlip(context: AudioContext, frequency: number, duration: number, noisy: boolean): AudioBuffer {
  const rate = context.sampleRate
  const length = Math.floor(rate * duration)
  const buffer = context.createBuffer(1, length, rate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / rate
    const decay = Math.exp(-t * 18)
    const sample = noisy ? Math.random() * 2 - 1 : Math.sign(Math.sin(TAU * frequency * t))
    data[i] = sample * decay * 0.3
  }
  return buffer
}

export function createPlayground(app: GameApp, input: Input, juice: Juice): Scene {
  const { bloom, particles, shake, tweens, screenfx, audio } = juice

  const container = new Container()
  const shapes: Shape[] = []

  /** Stanje [0] toggla - sve off naspram sve on, ne toggle po sustavu. */
  let allOn = true
  /** [T] - trailovi, ujedno stress test za mjerenje fps-a na 500+ cestica. */
  let trailsOn = false

  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 12, fill: palette.ink, lineHeight: 17 },
  })
  hud.position.set(12, 12)

  /**
   * Trail koristi `base` varijantu akcenta, a sam oblik `bright`. Zato jezgra
   * glowa a trag ne - to je cijela poanta dvije varijante po akcentu, i drzi
   * ekran citljivim na 500 cestica umjesto da postane bijela mrlja.
   */
  function attachTrail(shape: Shape): void {
    shape.trail = particles.emitter({
      follow: () => ({ x: shape.x, y: shape.y }),
      rate: TRAIL_RATE,
      color: palette.accent[shape.accent].base,
      speed: [0, 30],
      life: [0.35, 0.75],
      size: [1.5, 3.5],
      spread: TAU,
      drag: 0.5,
    })
  }

  function addShape(): void {
    const shape = spawnShape()
    shapes.push(shape)
    container.addChild(shape.gfx)
    if (trailsOn) attachTrail(shape)

    // Dolazak kroz tween: naraste od nista do pune velicine s malim prebacajem.
    // Ovo je najcistiji demo tweena u playgroundu - dogada se sam, bez bursta i
    // tresenja oko sebe. S ugasenim [4] oblik se samo pojavi, gotov.
    shape.gfx.scale.set(0)
    shape.anim = tweens.tween(shape.gfx.scale, { x: 1, y: 1 }, 0.35, { ease: 'backOut' })
  }

  /** Jedan klik demonstrira cijeli stack odjednom. */
  function destroy(shape: Shape): void {
    const index = shapes.indexOf(shape)
    if (index < 0) return
    shapes.splice(index, 1)
    shape.trail?.stop()
    container.removeChild(shape.gfx)
    shape.gfx.destroy()

    particles.burst({
      x: shape.x,
      y: shape.y,
      color: palette.accent[shape.accent].bright,
      count: 24,
      speed: [80, 320],
      life: [0.3, 0.7],
      size: [2, 5],
      spread: TAU,
      drag: 0.35,
    })
    // 0.6 = "eksplozija" iz specifikacije. Unistenje oblika jest eksplozija;
    // prijasnjih 0.35 je bilo nista.
    shake.add(0.6)
    screenfx.flash(palette.ink, 0.08, 0.45)
    screenfx.hitstop(0.05)
    audio.play('hit')

    for (const other of shapes) {
      const distance = Math.hypot(other.x - shape.x, other.y - shape.y)
      if (distance > NEIGHBOUR_RADIUS) continue

      // Val, ne skupni trzaj: blizi oblici skoce prije daljih, pa se udarac
      // vidi kako putuje kroz scenu. Ovo je tween, ne cestice.
      tweens.after(distance / RIPPLE_SPEED, () => {
        if (!shapes.includes(other)) return
        // Otkazi prethodnu animaciju i vrati scale na bazu - inace se dva
        // punch-a preklope i oblik trajno odluta od svoje velicine.
        other.anim?.cancel()
        other.gfx.scale.set(1)
        other.anim = tweens.punch(other.gfx, 0.5, 0.4)
        audio.play('pop', { volume: 0.35 })
      })
    }

    tweens.after(RESPAWN_DELAY, addShape)
  }

  function handleClick(): void {
    if (!input.pointer.justDown) return
    for (const shape of shapes) {
      const distance = Math.hypot(shape.x - input.pointer.x, shape.y - input.pointer.y)
      if (distance <= shape.radius) {
        destroy(shape)
        return
      }
    }
  }

  function handleToggles(): void {
    if (input.pressed('1')) bloom.enabled = !bloom.enabled
    if (input.pressed('2')) particles.enabled = !particles.enabled
    if (input.pressed('3')) shake.enabled = !shake.enabled
    if (input.pressed('4')) tweens.enabled = !tweens.enabled
    if (input.pressed('5')) screenfx.enabled = !screenfx.enabled
    if (input.pressed('6')) audio.enabled = !audio.enabled
    if (input.pressed('m')) audio.muted = !audio.muted

    if (input.pressed('t')) {
      trailsOn = !trailsOn
      for (const shape of shapes) {
        if (trailsOn) {
          attachTrail(shape)
        } else {
          shape.trail?.stop()
          shape.trail = null
        }
      }
    }

    if (input.pressed('0')) {
      allOn = !allOn
      bloom.enabled = allOn
      particles.enabled = allOn
      shake.enabled = allOn
      tweens.enabled = allOn
      screenfx.enabled = allOn
      audio.enabled = allOn
    }
  }

  function tuneBloom(dt: number): void {
    let dThreshold = 0
    if (input.down('up')) dThreshold += THRESHOLD_RATE * dt
    if (input.down('down')) dThreshold -= THRESHOLD_RATE * dt
    if (dThreshold !== 0) {
      bloom.filter.threshold = clamp(bloom.filter.threshold + dThreshold, 0, 1)
    }

    let dScale = 0
    if (input.down('right')) dScale += SCALE_RATE * dt
    if (input.down('left')) dScale -= SCALE_RATE * dt
    if (dScale !== 0) {
      bloom.filter.bloomScale = clamp(bloom.filter.bloomScale + dScale, 0, 4)
    }
  }

  function moveShapes(dt: number): void {
    for (const s of shapes) {
      s.x += s.vx * dt
      s.y += s.vy * dt

      if (s.x - s.radius < 0) {
        s.x = s.radius
        s.vx = Math.abs(s.vx)
      }
      if (s.x + s.radius > WIDTH) {
        s.x = WIDTH - s.radius
        s.vx = -Math.abs(s.vx)
      }
      if (s.y - s.radius < 0) {
        s.y = s.radius
        s.vy = Math.abs(s.vy)
      }
      if (s.y + s.radius > HEIGHT) {
        s.y = HEIGHT - s.radius
        s.vy = -Math.abs(s.vy)
      }

      s.gfx.position.set(s.x, s.y)
    }
  }

  function flag(on: boolean): string {
    return on ? 'ON ' : 'off'
  }

  function drawHud(): void {
    hud.text = [
      `${Math.round(app.pixi.ticker.FPS)} fps    cestica ${particles.active}`,
      '',
      `[1] bloom ${flag(bloom.enabled)}   [2] particles ${flag(particles.enabled)}   [3] shake ${flag(shake.enabled)}`,
      `[4] tween ${flag(tweens.enabled)}   [5] screenfx ${flag(screenfx.enabled)}   [6] audio ${flag(audio.enabled)}`,
      `[0] sve ${allOn ? 'OFF' : 'ON'}      [M] mute ${flag(!audio.muted)}      [T] trailovi ${flag(trailsOn)}`,
      '',
      `bloom threshold ${bloom.filter.threshold.toFixed(2)}   scale ${bloom.filter.bloomScale.toFixed(2)}`,
      `strelice gore/dolje = threshold, lijevo/desno = scale`,
      '',
      `klik na oblik = burst + shake + flash + hitstop + val punch-a na susjedima + sfx`,
      `[4] tween je vidljiv dvaput: val kroz susjede, i kako novi oblik naraste`,
    ].join('\n')
  }

  return {
    container,

    enter() {
      audio.register('hit', synthBlip(audio.context, 180, 0.2, true))
      audio.register('pop', synthBlip(audio.context, 620, 0.1, false))

      for (let i = 0; i < SHAPE_COUNT; i++) addShape()
      app.ui.addChild(hud)
    },

    exit() {
      app.ui.removeChild(hud)
      for (const shape of shapes) shape.trail?.stop()
      container.removeChildren()
      shapes.length = 0
      particles.clear()
    },

    update(dt: number) {
      handleToggles()
      tuneBloom(dt)
      handleClick()
      moveShapes(dt)
      drawHud()
    },
  }
}
