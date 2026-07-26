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

/** En web lee metadata del video (blob:/http:) para obtener duración en segundos. */
export function probeVideoDurationSeconds(uri: string): Promise<number> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (segundos: number) => {
      video.removeAttribute('src');
      video.load();
      resolve(segundos);
    };
    video.onloadedmetadata = () => {
      const raw = video.duration;
      const s = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
      finish(s);
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
