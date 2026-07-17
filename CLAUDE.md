# juice-boilerplate

TypeScript + Pixi.js template koji od prvog dana daje paletu, bloom, particles, screenshake, tween i SFX. Nije engine - minimalna jezgra plus juice helperi. Cilj: na game jamu se pise samo gameplay.

Specifikacija (motivacija, moduli, definicija gotovog) zivi u `game-development` repou: `juice-boilerplate.md`.

## Pravila

- **Strict typing, bez `any`.** `tsconfig.json` je strict namjerno - ako tip smeta, popraviti dizajn, ne olabaviti tip. Cast kroz `as` samo kad Pixi API ne ostavlja izbora, i uz komentar zasto.
- **Sve boje iskljucivo iz `src/juice/palette.ts`.** Nijedan hex literal ne smije postojati igdje drugdje. Novi ton = novi unos u paleti.
- **Nove ovisnosti samo uz eksplicitnu Vatrinu odluku.** Dozvoljene su pixi.js, pixi-filters, vite, typescript i nista drugo. Svaka dodatna je odluka, ne default.
- **Nema asseta u templateu.** Template je 100% kod - i zbog jam pravila o unaprijed pripremljenim assetima. Foldera `assets/` namjerno nema: Vite podnosi da `publicDir` ne postoji, pa ga igra stvori kad dobije prvi zvuk. Sve u `assets/` servira se s korijena (`assets/sfx/hit.wav` → `audio.load({ hit: 'sfx/hit.wav' })`).
- **`core/` i `juice/` su API.** Ako igra treba izmjenu u njima da bi radila, API nije dobar - popraviti template, ne igru.
- Nakon izmjena: commitati i pushati bez pitanja.
- Hrvatski u komentarima i dokumentaciji, engleski u kodu (imena simbola).

## Struktura

```
src/
  main.ts            bootstrap
  core/              app (layeri, letterbox), loop (dt, timeScale), scene, input
  juice/             palette, bloom, particles, shake, tween, screenfx, audio
  scenes/            playground = acceptance test
```

- `world` container nosi bloom i screenshake. `ui` container ne nosi nista - HUD mora ostati ostar.
- Logicka rezolucija 960x540 je konstanta u `core/app.ts`. Gameplay kod nikad ne vidi piksele ekrana.
- `dt` je u sekundama i clampan na 1/30. `loop.timeScale` je mehanizam za hitstop; pretplatnici s `unscaled: true` ga ignoriraju.
