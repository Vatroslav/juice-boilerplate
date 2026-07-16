import { createApp } from './core/app'
import { createLoop } from './core/loop'
import { createInput } from './core/input'
import { createSceneManager } from './core/scene'
import { createJuice } from './juice'
import { createPlayground } from './scenes/playground'

const app = await createApp()
const loop = createLoop(app.pixi)
const input = createInput(app, loop)
const scenes = createSceneManager(app.world, loop)
const juice = createJuice(app, loop)

scenes.switch(createPlayground(app, input, juice))
