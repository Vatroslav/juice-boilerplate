import type { GameApp } from './app'
import type { Loop } from './loop'

export interface Pointer {
  /** Logicke koordinate - vec promapirane kroz viewport scaling. */
  x: number
  y: number
  down: boolean
  /** Pritisnut bas u ovom frameu. */
  justDown: boolean
}

export interface Input {
  /** Tipka se drzi. */
  down(key: string): boolean
  /** Tipka je upravo pritisnuta (ovaj frame). */
  pressed(key: string): boolean
  /** Normaliziran smjer, WASD i strelice zajedno. */
  axis(): { x: number; y: number }
  readonly pointer: Pointer
}

/** Tipke koje bi inace skrolale stranicu ispod igre. */
const SWALLOW = new Set(['space', 'up', 'down', 'left', 'right'])

/**
 * KeyboardEvent.code → kratko ime neovisno o rasporedu tipkovnice.
 * 'KeyA' → 'a', 'ArrowLeft' → 'left', 'Digit1' → '1', 'Space' → 'space'.
 */
function normalize(code: string): string {
  if (code.startsWith('Key')) return code.slice(3).toLowerCase()
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Arrow')) return code.slice(5).toLowerCase()
  if (code.startsWith('Shift')) return 'shift'
  if (code.startsWith('Control')) return 'ctrl'
  if (code.startsWith('Alt')) return 'alt'
  return code.toLowerCase()
}

export function createInput(app: GameApp, loop: Loop): Input {
  const held = new Set<string>()
  const justPressed = new Set<string>()
  const pointer: Pointer = { x: 0, y: 0, down: false, justDown: false }

  window.addEventListener('keydown', (e) => {
    const key = normalize(e.code)
    if (SWALLOW.has(key)) e.preventDefault()
    if (!e.repeat) justPressed.add(key)
    held.add(key)
  })

  window.addEventListener('keyup', (e) => {
    held.delete(normalize(e.code))
  })

  // Alt-tab usred drzanja tipke inace ostavi tipku "zaglavljenu".
  window.addEventListener('blur', () => {
    held.clear()
    pointer.down = false
  })

  function movePointer(e: PointerEvent): void {
    const p = app.toLogical(e.clientX, e.clientY)
    pointer.x = p.x
    pointer.y = p.y
  }

  window.addEventListener('pointermove', movePointer)
  window.addEventListener('pointerdown', (e) => {
    movePointer(e)
    pointer.down = true
    pointer.justDown = true
  })
  window.addEventListener('pointerup', () => {
    pointer.down = false
  })

  // Zadnje u frameu, poslije svih update-ova - inace scena propusti pritisak.
  loop.addLate(() => {
    justPressed.clear()
    pointer.justDown = false
  })

  return {
    down: (key: string) => held.has(key),
    pressed: (key: string) => justPressed.has(key),
    axis() {
      let x = 0
      let y = 0
      if (held.has('a') || held.has('left')) x -= 1
      if (held.has('d') || held.has('right')) x += 1
      if (held.has('w') || held.has('up')) y -= 1
      if (held.has('s') || held.has('down')) y += 1
      const len = Math.hypot(x, y)
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
    },
    pointer,
  }
}
