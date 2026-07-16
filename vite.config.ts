import { defineConfig } from 'vite'

export default defineConfig({
  // Relativni pathovi - bez ovoga build puca na itchu (servira se iz poddirektorija).
  base: './',
  publicDir: 'assets',
  build: { target: 'es2022' },
})
