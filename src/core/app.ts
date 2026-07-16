import { Application, Container, Graphics } from 'pixi.js'
import { palette } from '../juice/palette'

/**
 * Logicka rezolucija. Gameplay kod radi ISKLJUCIVO u ovim koordinatama i nikad
 * ne vidi piksele ekrana - skaliranje je posao appa. 16:9, standardna itch embed
 * velicina.
 */
export const WIDTH = 960
export const HEIGHT = 540

export interface Viewport {
  /** Faktor skaliranja logickog okvira na ekran. */
  scale: number
  offsetX: number
  offsetY: number
}

export interface GameApp {
  readonly pixi: Application
  /** Sve sto je igra. Na ovo ide bloom i screenshake. */
  readonly world: Container
  /** HUD, tekst, fullscreen overlay. Bez blooma - inace je HUD kasa. */
  readonly ui: Container
  readonly viewport: Viewport
  /** Koordinate misa iz eventa → logicke koordinate. */
  toLogical(clientX: number, clientY: number): { x: number; y: number }
}

export async function createApp(): Promise<GameApp> {
  const pixi = new Application()
  await pixi.init({
    width: window.innerWidth,
    height: window.innerHeight,
    background: 0x000000, // letterbox trake
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })
  document.body.appendChild(pixi.canvas)

  // root drzi cijeli logicki okvir i jedini se skalira.
  const root = new Container()
  pixi.stage.addChild(root)

  const backdrop = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({ color: palette.bg })
  const world = new Container()
  const ui = new Container()
  root.addChild(backdrop, world, ui)

  // Maska zivi u stage koordinatama (root je skaliran i pomaknut), pa nista ne
  // moze iscuriti izvan logickog okvira - ni kad ga screenshake pomakne.
  const mask = new Graphics()
  pixi.stage.addChild(mask)
  root.mask = mask

  const viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 }

  function resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    pixi.renderer.resize(w, h)

    const scale = Math.min(w / WIDTH, h / HEIGHT)
    const offsetX = Math.round((w - WIDTH * scale) / 2)
    const offsetY = Math.round((h - HEIGHT * scale) / 2)

    viewport.scale = scale
    viewport.offsetX = offsetX
    viewport.offsetY = offsetY

    root.scale.set(scale)
    root.position.set(offsetX, offsetY)

    mask
      .clear()
      .rect(offsetX, offsetY, WIDTH * scale, HEIGHT * scale)
      .fill({ color: 0xffffff })
  }

  resize()
  window.addEventListener('resize', resize)

  return {
    pixi,
    world,
    ui,
    viewport,
    toLogical(clientX: number, clientY: number) {
      const rect = pixi.canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left - viewport.offsetX) / viewport.scale,
        y: (clientY - rect.top - viewport.offsetY) / viewport.scale,
      }
    },
  }
}
