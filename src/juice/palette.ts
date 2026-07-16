/**
 * Paleta - jedina definicija boja u projektu.
 *
 * PRAVILO: nijedan hex literal ne smije postojati izvan ovog filea.
 *
 * Svaki akcent ima `base` i `bright` varijantu. `bright` je iznad bloom
 * thresholda (vidi juice/bloom.ts), `base` je ispod. Posljedica: odluka
 * "ovo svijetli" donosi se odabirom boje, ne diranjem filtera.
 *
 * Zamjena cijele palete = zamjena vrijednosti ispod, nista drugo.
 * Izvor gotovih paleta: https://lospec.com/palette-list
 */

export const palette = {
  /** Pozadina - tamna, da bloom ima na cemu raditi. */
  bg: 0x0d0b1f,
  /** Nijansa iznad pozadine, za suptilnu dubinu (grid, paneli). */
  bgAlt: 0x1a1633,
  /** Glavna ink boja - tekst, HUD, obrisi. */
  ink: 0xe8e6f0,

  accent: {
    cyan: { base: 0x2e7fa8, bright: 0x5fe6ff },
    magenta: { base: 0xa83e6b, bright: 0xff5fa2 },
    amber: { base: 0xb8862e, bright: 0xffd45f },
  },
} as const

export type AccentName = keyof typeof palette.accent

export const accentNames = Object.keys(palette.accent) as AccentName[]

/** Nasumican akcent - za particle i placeholder oblike. */
export function randomAccent(): AccentName {
  const i = Math.floor(Math.random() * accentNames.length)
  return accentNames[i] as AccentName
}
