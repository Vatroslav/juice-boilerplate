import type { Container } from 'pixi.js'
import type { Loop } from './loop'

export interface Scene {
  /** Dodaje se u `world` na enter, mice na exit. */
  container: Container
  enter(): void
  exit(): void
  update(dt: number): void
}

export interface SceneManager {
  readonly current: Scene | null
  switch(scene: Scene): void
}

/**
 * Bez stacka i bez tranzicija - jam igri trebaju menu, game i gameover.
 * Tranzicije su svjesno odgodene (v2).
 */
export function createSceneManager(world: Container, loop: Loop): SceneManager {
  let current: Scene | null = null

  loop.add((dt) => {
    current?.update(dt)
  })

  return {
    get current() {
      return current
    },
    switch(scene: Scene) {
      if (current !== null) {
        current.exit()
        world.removeChild(current.container)
      }
      current = scene
      world.addChild(scene.container)
      scene.enter()
    },
  }
}
