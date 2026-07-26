import { Platform } from 'react-native';

/**
 * Expo ImagePicker: duration suele venir en ms (nativo). En web a menudo no viene.
 * Heurística: valores > 1000 → ms; si no → ya son segundos.
 */
export function normalizarDuracionSegundos(duration?: number | null): number {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return duration > 1000 ? Math.round(duration / 1000) : Math.round(duration);
}

/**
 * En web lee metadata del video (blob:/http:) para obtener duración en segundos.
 *
 * Devuelve décimas, no segundos enteros: el recorte necesita esa precisión para
 * que las manijas caigan donde el usuario las suelta.
 *
 * Lo que graba `MediaRecorder` (o sea, todo video capturado desde el navegador)
 * sale con `duration === Infinity` porque el WebM no trae el header de duración.
 * El truco conocido es saltar a un tiempo imposible: el navegador se frena en el
 * último frame y recién ahí publica la duración real por `durationchange`.
 */
export function probeVideoDurationSeconds(uri: string): Promise<number> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    let listo = false;
    const finish = (segundos: number) => {
      if (listo) return;
      listo = true;
      clearTimeout(limite);
      video.removeAttribute('src');
      video.load();
      resolve(segundos > 0 ? Math.round(segundos * 10) / 10 : 0);
    };

    // Si el archivo está roto o tarda demasiado, mejor devolver 0 (el que llama
    // tiene un fallback) que dejar el editor colgado esperando.
    const limite = setTimeout(() => finish(0), 4000);

    const leer = () => {
      const raw = video.duration;
      if (Number.isFinite(raw) && raw > 0) finish(raw);
    };

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(video.duration);
        return;
      }
      video.ondurationchange = leer;
      video.onseeked = leer;
      // Un tiempo que ningún video alcanza: fuerza al navegador a recorrerlo
      // hasta el final y ahí calcular la duración.
      video.currentTime = 1e101;
    };
    video.onerror = () => finish(0);
    video.src = uri;
  });
}

export function esAssetVideo(asset: {
  type?: string | null;
  mimeType?: string | null;
  uri?: string;
}): boolean {
  if (asset.type === 'video') return true;
  if ((asset.mimeType ?? '').startsWith('video')) return true;
  const uri = (asset.uri ?? '').toLowerCase();
  return /\.(mp4|mov|m4v|webm|avi)(\?|$)/.test(uri);
}
