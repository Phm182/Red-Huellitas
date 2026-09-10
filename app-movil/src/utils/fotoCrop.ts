import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import type { StoryFotoTransform } from '../stories/storyEditorTypes';

/**
 * Convierte el zoom/paneo/rotación manual que el usuario aplicó EN PANTALLA
 * (`fotoTransform`, en píxeles del canvas de edición) al recorte real de la
 * imagen fuente, y lo aplica con expo-image-manipulator. Devuelve la URI del
 * archivo ya recortado (nuevo temporal, no toca el original).
 *
 * La cuenta es la inversa de cómo se ve en pantalla: el `<Image resizeMode
 * "cover">` del editor ya deja la foto "cover" dentro del canvas por su
 * cuenta, y `fotoTransform` es un `scale`+`translate`+`rotate` ENCIMA de eso
 * (mismo orden que aplica `StoryMediaFill`: rota y escala primero, alrededor
 * del centro — los dos conmutan entre sí —, y recién arriba de eso corre
 * `x`/`y` en píxeles de pantalla). Para saber qué rectángulo de la foto
 * ORIGINAL quedó visible hay que deshacer las transformaciones en orden
 * inverso: PRIMERO la rotación (rotando la imagen fuente entera ese mismo
 * ángulo — así lo que era "un rectángulo derecho visto rotado" vuelve a ser
 * un rectángulo derecho), y sólo ENTONCES el cover de base + zoom/arrastre,
 * exactamente con la misma cuenta que ya existía para cuando no había
 * rotación.
 */
export async function aplicarZoomFoto(
  uriOriginal: string,
  fotoTransform: StoryFotoTransform,
  canvasSize: { w: number; h: number }
): Promise<string> {
  // Rotar la imagen fuente ENTERA por el mismo ángulo que se rotó en
  // pantalla. `expo-image-manipulator` gira alrededor del centro y devuelve
  // el nuevo ancho/alto ya calculados (el rectángulo que rotó queda más
  // grande que el original, salvo múltiplos de 90°) — separado del recorte
  // de abajo porque ese recorte asume una imagen SIN rotar.
  const rotacion = ((fotoTransform.rotation % 360) + 360) % 360;
  const rotada =
    rotacion > 0.5
      ? await ImageManipulator.manipulateAsync(uriOriginal, [{ rotate: rotacion }], {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        })
      : null;
  const uri = rotada?.uri ?? uriOriginal;

  const { srcW, srcH } = rotada
    ? { srcW: rotada.width, srcH: rotada.height }
    : await new Promise<{ srcW: number; srcH: number }>((resolve, reject) => {
        Image.getSize(
          uriOriginal,
          (width, height) => resolve({ srcW: width, srcH: height }),
          (err) => reject(err)
        );
      });

  const { w: canvasW, h: canvasH } = canvasSize;
  if (canvasW <= 0 || canvasH <= 0 || srcW <= 0 || srcH <= 0) return uri;

  // "cover" de base: cómo entra la foto real en el canvas antes de tocar nada.
  const baseScale = Math.max(canvasW / srcW, canvasH / srcH);
  const escalaTotal = baseScale * fotoTransform.scale;

  const anchoRecorte = canvasW / escalaTotal;
  const altoRecorte = canvasH / escalaTotal;
  let origenX = srcW / 2 - (canvasW / 2 + fotoTransform.x) / escalaTotal;
  let origenY = srcH / 2 - (canvasH / 2 + fotoTransform.y) / escalaTotal;

  // Salvaguarda: el arrastre en pantalla ya viene acotado (clampFotoPan en
  // StoryEditor), pero si por lo que sea el resultado se pasa del borde de
  // la imagen real, se corrige acá para no pedirle a expo-image-manipulator
  // un recorte que caiga fuera de la foto (tira error y no publica nada).
  origenX = Math.max(0, Math.min(srcW - anchoRecorte, origenX));
  origenY = Math.max(0, Math.min(srcH - altoRecorte, origenY));

  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.round(origenX),
          originY: Math.round(origenY),
          width: Math.round(anchoRecorte),
          height: Math.round(altoRecorte),
        },
      },
    ],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
  );

  return resultado.uri;
}
