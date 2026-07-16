export interface PlayOpts {
  /** Odstupanje playback ratea, ±udio. Default 0.1. */
  pitchJitter?: number
  volume?: number
}

export interface Audio {
  /** Ucitaj .wav po imenu: `load({ hit: 'sfx/hit.wav' })`. */
  load(map: Record<string, string>): Promise<void>
  /** Registriraj vec gotov buffer - za zvuk sintetiziran u kodu, bez asseta. */
  register(name: string, buffer: AudioBuffer): void
  play(name: string, opts?: PlayOpts): void
  music(url: string, opts?: { volume?: number }): Promise<void>
  stopMusic(): void
  muted: boolean
  enabled: boolean
  readonly context: AudioContext
}

export function createAudio(): Audio {
  const context = new AudioContext()
  const master = context.createGain()
  master.connect(context.destination)

  const buffers = new Map<string, AudioBuffer>()
  let muted = false
  let enabled = true
  let musicEl: HTMLAudioElement | null = null

  // Browser drzi AudioContext suspendiranim dok korisnik nista nije dirao.
  // Bez ovoga prvi zvuk u igri tiho ne svira.
  function resume(): void {
    if (context.state === 'suspended') void context.resume()
  }
  window.addEventListener('pointerdown', resume)
  window.addEventListener('keydown', resume)

  function applyMute(): void {
    master.gain.value = muted ? 0 : 1
    if (musicEl !== null) musicEl.muted = muted
  }

  // Lokalna funkcija, ne metoda - da `const { music } = audio` i dalje radi.
  function stopMusic(): void {
    if (musicEl === null) return
    musicEl.pause()
    musicEl = null
  }

  return {
    async load(map: Record<string, string>) {
      await Promise.all(
        Object.entries(map).map(async ([name, url]) => {
          const response = await fetch(url)
          const data = await response.arrayBuffer()
          buffers.set(name, await context.decodeAudioData(data))
        }),
      )
    },

    register(name: string, buffer: AudioBuffer) {
      buffers.set(name, buffer)
    },

    play(name: string, opts: PlayOpts = {}) {
      if (!enabled || muted) return
      const buffer = buffers.get(name)
      if (buffer === undefined) return

      const source = context.createBufferSource()
      source.buffer = buffer

      // Pitch jitter je DEFAULT, ne opcija koje se treba sjetiti - isti zvuk
      // triput zaredom inace zvuci kao strojnica.
      const jitter = opts.pitchJitter ?? 0.1
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * jitter

      const gain = context.createGain()
      gain.gain.value = opts.volume ?? 1

      source.connect(gain)
      gain.connect(master)
      source.start()
    },

    async music(url: string, opts: { volume?: number } = {}) {
      stopMusic()
      const element = new window.Audio(url)
      element.loop = true
      element.volume = opts.volume ?? 0.5
      element.muted = muted
      musicEl = element
      await element.play()
    },

    stopMusic,

    get muted() {
      return muted
    },
    set muted(value: boolean) {
      if (value === muted) return
      muted = value
      applyMute()
    },

    get enabled() {
      return enabled
    },
    set enabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      if (!value) stopMusic()
    },

    get context() {
      return context
    },
  }
}
