import { Platform } from 'react-native';

/**
 * En nativo, RN's FormData polyfill reconoce el shape {uri,name,type} y arma
 * el archivo para el bridge. En web NO existe ese polyfill: FormData es la
 * nativa del navegador, así que pasarle ese objeto se serializa como texto
 * "[object Object]" y el upload queda roto en silencio. En web hay que
 * resolver el uri (blob:/data:) a un Blob real antes de appendearlo.
 * Usado por cualquier API que suba imágenes (perfilApi, mascotasApi, etc).
 */
export async function appendImageFile(form: FormData, field: string, uri: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    form.append(field, blob, filename);
  } else {
    form.append(field, { uri, name: filename, type: 'image/jpeg' } as unknown as Blob);
  }
}

/**
 * Arma el campo `ordenFotos` que esperan los endpoints de edición.
 *
 * La galería editable mezcla fotos que ya estaban en el servidor con otras
 * recién elegidas, y el orden final importa (la primera es la portada). Por eso
 * viaja una sola lista de slots — `e:<id>` para las existentes y `n:<índice>`
 * para las nuevas — en vez de dos listas separadas: con dos listas se pierde la
 * posición de una foto nueva insertada entre dos viejas.
 *
 * `fotosExistentesIds` va alineado por índice con `fotos`; un 0 o null en esa
 * posición significa "esta es nueva".
 */
export async function appendOrdenFotos(
  form: FormData,
  fotos: string[],
  fotosExistentesIds: (number | null)[]
): Promise<void> {
  const orden: string[] = [];
  let nuevaIdx = 0;

  for (let i = 0; i < fotos.length; i++) {
    const existenteId = fotosExistentesIds[i] ?? 0;
    if (existenteId > 0) {
      orden.push(`e:${existenteId}`);
    } else {
      orden.push(`n:${nuevaIdx}`);
      await appendImageFile(form, 'fotos[]', fotos[i], `foto${nuevaIdx}.jpg`);
      nuevaIdx++;
    }
  }

  form.append('ordenFotos', JSON.stringify(orden));
}

/**
 * Mismo problema/solución que appendImageFile pero para video crudo sin
 * transcodificar (Shorts/Historias) — el mime debe ser video/mp4 o
 * video/quicktime real, nunca forzado a imagen.
 */
export async function appendVideoFile(
  form: FormData,
  field: string,
  uri: string,
  filename: string,
  mimeType: string
): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    form.append(field, blob, filename);
  } else {
    form.append(field, { uri, name: filename, type: mimeType } as unknown as Blob);
  }
}
