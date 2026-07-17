# juice-boilerplate

TypeScript + Pixi.js template koji od prvog dana daje paletu, bloom, particles, screenshake, tween i SFX - da igra od pravokutnika izgleda kao da je tako htjela izgledati.

Nije engine: nema fizike, nema ECS-a, nema editora. Minimalna jezgra plus juice helperi, i nista vise.

## Nova igra u tri koraka

1. **Use this template** na GitHubu → novi repo → `git clone` → `npm install`.
2. `npm run dev` - playground se pokrece. Zamijeni ga svojom scenom u `src/main.ts`.
3. Boje mijenjas na jednom mjestu: `src/juice/palette.ts` (gotove palete: [Lospec](https://lospec.com/palette-list)).

`npm run build` radi staticki `dist/` spreman za itch.io (`base: './'` je vec postavljen - bez toga pathovi pucaju u itch embedu).

## Sto je unutra

| Modul | Sto radi |
|---|---|
| `juice/palette` | Jedina definicija boja. Svaki akcent ima `base` i `bright`; `bright` je iznad bloom thresholda, pa "ovo svijetli" biras odabirom boje. |
| `juice/bloom` | `AdvancedBloomFilter` na `world` containeru. HUD (`ui`) ostaje ostar. |
| `juice/particles` | Pooled sustav: `burst` za udarac, `emitter` za trail. Bez asseta - generirana tekstura plus tint. |
| `juice/shake` | Trauma-based screenshake. Offset skalira s trauma², pa mali hitovi jedva mrdnu a veliki tresu. |
| `juice/tween` | `tween`, `punch`, `after`. Sest easinga - `backOut` i `elasticOut` nose vecinu posla. |
| `juice/screenfx` | `flash` i `hitstop`. Oba rade i dok je svijet zamrznut. |
| `juice/audio` | SFX s pitch jitterom, music loop, mute. |
| `core/` | `app` (layeri, letterbox scaling), `loop` (dt u sekundama, clamp, timeScale), `scene`, `input`. |

Playground (`src/scenes/playground.ts`) pali i gasi svaki sustav zasebno - razlika izmedu "sve off" i "sve on" je cijela poanta ovog templatea.

## Stanje

U izradi, ali sve postoji i vrti se. Jezgra i svih sest juice modula rade i prosudeni su u playgroundu (Chrome).

Performanse su izmjerene i prolaze: **572 cestice uz ukljucen bloom, najgori frame u tri sekunde 98 fps** (trazi se 60), i to uz klikanje - dakle burst, shake, flash i hitstop u istom frameu. Mjereno na 100 Hz ekranu, pa je 100 vsync cap i pravi strop je jos vise.

Preostalo do gotovog:

- Deploy na itch.
- Napraviti mini-igru iz ovog templatea **bez ijedne izmjene u `core/` i `juice/`**. To je pravi test API-ja; ako igra mora dirati jezgru, jezgra nije gotova.

## Licenca

MIT - vidi [LICENSE](LICENSE).
