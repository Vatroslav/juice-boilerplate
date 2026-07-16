# assets/sfx

**Prazan po dizajnu.** Template ne sadrzi nijedan asset - i zato sto je to cist kod, i zato sto jam pravila cesto ogranicavaju unaprijed pripremljene assete. Kod pripremljen unaprijed je obicno dozvoljen, asseti nisu uvijek.

Workflow po igri:

1. Generirati zvuk u [sfxr](https://sfxr.me/) ili [Chiptone](https://sfbgames.itch.io/chiptone).
2. Export `.wav` ovdje (`assets/sfx/hit.wav`).
3. Registrirati u sceni: `audio.load({ hit: 'sfx/hit.wav' })`, okinuti s `audio.play('hit')`.

Pitch jitter je ukljucen po defaultu, pa isti `.wav` triput zaredom ne zvuci kao strojnica.

Playground ne koristi ovaj folder - on sintetizira zvuk u kodu, da template ostane bez asseta.
