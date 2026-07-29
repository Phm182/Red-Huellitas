# SFX HueGotchi

Colocá acá 10 maullidos (MP3 o WAV) para gato:

- `m01.mp3` … `m10.mp3`

Luego registralos en `src/juego/huegotchi/audio/catalog.ts` → `VOICE_ASSETS.gato`.

Sin archivos, la app usa síntesis Web Audio (10 perfiles distintos según ánimo) + háptica.

Misma carpeta para `perro/` con ladridos cuando los tengas.
