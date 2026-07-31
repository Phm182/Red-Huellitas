/**
 * Genera iconos Expo/Android desde el logo oficial de Red Huellitas.
 * Fuente: assets/logo/icono.png + siluetas blancas.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = (...p) => path.join(root, ...p);

const ICONO = out('assets/logo/icono.png');
const SILUETAS = out('assets/logo/rh-siluetas-blancas-2.png');
const TEAL = { r: 15, g: 118, b: 110, alpha: 1 }; // #0F766E (accent marca)

async function solid(size, color) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: color },
  }).png();
}

/** Logo blanco centrado con margen (safe zone adaptive ~66%). */
async function foreground(size = 1024, insetRatio = 0.22) {
  const inset = Math.round(size * insetRatio);
  const inner = size - inset * 2;
  const logo = await sharp(SILUETAS)
    .ensureAlpha()
    // Negro → transparente; blanco se mantiene
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(async ({ data, info }) => {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (r + g + b) / 3;
        // Fondo negro → alpha 0; blanco → alpha 255
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(lum);
      }
      return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    });

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, left: inset, top: inset }])
    .png();
}

async function main() {
  const size = 1024;

  // Icono principal / iOS / splash base: branding completo
  await sharp(ICONO).resize(size, size).png().toFile(out('assets/icon.png'));
  await sharp(ICONO).resize(48, 48).png().toFile(out('assets/favicon.png'));
  await sharp(ICONO).resize(size, size).png().toFile(out('assets/splash-icon.png'));

  // Adaptive Android
  await (await foreground(size)).toFile(out('assets/android-icon-foreground.png'));
  await (await solid(size, TEAL)).toFile(out('assets/android-icon-background.png'));
  // Monochrome: silueta blanca (Android 13+)
  await (await foreground(size, 0.28)).toFile(out('assets/android-icon-monochrome.png'));

  console.log('OK icons → assets/icon.png + android-icon-*');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
