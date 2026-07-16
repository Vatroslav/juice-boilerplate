import { Container, Graphics, Text } from 'pixi.js'
import type { Scene } from '../core/scene'
import type { Input } from '../core/input'
import { WIDTH, HEIGHT, type GameApp } from '../core/app'
import { palette, randomAccent, type AccentName } from '../juice/palette'
import type { Bloom } from '../juice/bloom'

/**
 * Playground - acceptance test, ne demo za druge.
 *
 * Svaki juice modul koji stigne dobiva ovdje svoj toggle (tipke 1-6) i svoju
 * ulogu u klik-reakciji, pa se vidi na ekranu cim nastane. Razlika izmedu
 * "sve off" i "sve on" je cijeli argument ovog projekta.
 *
 * Stanje: bloom [1] radi. Particles, shake, tween, screenfx, audio jos ne
 * postoje - njihovi toggleovi stizu s modulima.
 */

const SHAPE_COUNT = 10

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

  const angle = Math.random() * Math.PI * 2
  const speed = 80 + Math.random() * 120

  return {
    gfx,
    x: radius + Math.random() * (WIDTH - radius * 2),
    y: radius + Math.random() * (HEIGHT - radius * 2),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    accent,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function createPlayground(app: GameApp, input: Input, bloom: Bloom): Scene {
  const container = new Container()
  const shapes: Shape[] = []

  /** Stanje [0] toggla - sve off naspram sve on, ne obicni toggle po sustavu. */
  let allOn = true

  // HUD ide na `ui` - bez blooma, ostaje ostar.
  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 13, fill: palette.ink, lineHeight: 18 },
  })
  hud.position.set(12, 12)

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

  function drawHud(): void {
    const fps = Math.round(app.pixi.ticker.FPS)
    const threshold = bloom.filter.threshold.toFixed(2)
    const scale = bloom.filter.bloomScale.toFixed(2)
    hud.text = [
      `${fps} fps`,
      `[1] bloom ${bloom.enabled ? 'ON ' : 'off'}   threshold ${threshold}   scale ${scale}`,
      `strelice gore/dolje = threshold, lijevo/desno = scale`,
    ].join('\n')
  }

  return {
    container,

    enter() {
      for (let i = 0; i < SHAPE_COUNT; i++) {
        const shape = spawnShape()
        shapes.push(shape)
        container.addChild(shape.gfx)
      }
      app.ui.addChild(hud)
    },

    exit() {
      app.ui.removeChild(hud)
      container.removeChildren()
      shapes.length = 0
    },

    update(dt: number) {
      if (input.pressed('1')) bloom.enabled = !bloom.enabled
      if (input.pressed('0')) {
        allOn = !allOn
        bloom.enabled = allOn
      }

      tuneBloom(dt)
      moveShapes(dt)
      drawHud()
    },
  }
}
