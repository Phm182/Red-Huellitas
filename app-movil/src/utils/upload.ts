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
