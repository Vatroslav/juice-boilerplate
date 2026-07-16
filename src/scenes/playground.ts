import { Container, Graphics, Text } from 'pixi.js'
import type { Scene } from '../core/scene'
import type { Input } from '../core/input'
import { WIDTH, HEIGHT, type GameApp } from '../core/app'
import { palette, randomAccent, type AccentName } from '../juice/palette'

/**
 * Playground - acceptance test, ne demo za druge.
 *
 * Zasad skelet: oblici iz palete se odbijaju, HUD radi, input radi. Svaki juice
 * modul koji stigne dobiva ovdje svoj toggle (tipke 1-6) i klik-reakciju, pa se
 * vidi na ekranu cim nastane.
 */

const SHAPE_COUNT = 10

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

export function createPlayground(app: GameApp, input: Input): Scene {
  const container = new Container()
  const shapes: Shape[] = []

  // HUD ide na `ui` - bez blooma, ostaje ostar.
  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 14, fill: palette.ink },
  })
  hud.position.set(12, 12)

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

      const fps = Math.round(app.pixi.ticker.FPS)
      const px = Math.round(input.pointer.x)
      const py = Math.round(input.pointer.y)
      hud.text = `${fps} fps    pointer ${px},${py}${input.pointer.down ? ' (down)' : ''}`
    },
  }
}
