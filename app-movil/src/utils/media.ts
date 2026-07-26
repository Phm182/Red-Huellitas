import { Platform } from 'react-native';
import { apiBaseUrl } from '../api/client';

let cachedRoot: string | null = null;

/** Root público del proyecto (ej. http://localhost/Red%20Huellitas), sin el /inc final. */
function rhPublicRoot(): string {
  if (cachedRoot === null) {
    cachedRoot = apiBaseUrl().replace(/\/inc\/?$/, '');
  }
  return cachedRoot;
}

/**
 * Construye la URL pública completa de un archivo servido en uploads/
 * (avatares, fotos de mascota). NO usar para archivos privados como el
 * carnet de vacunas — esos se sirven vía carnet_ver.php con auth, ver
 * `fetchAuthenticatedImageUri`.
 */
export function rhMediaUrl(relativePath: string): string {
  return `${rhPublicRoot()}/uploads/${relativePath}`;
}

/**
 * URL de avatar con cache-bust vía query `?t=`.
 * Usa /uploads/… (siempre disponible). El endpoint ajax/media/avatar.php
 * solo ayuda cuando está desplegado en el server; no lo usamos como
 * primario para no romper test/prod si falta el archivo.
 */
export function rhAvatarUrl(relativePath: string, bust = 0): string {
  const base = rhMediaUrl(relativePath);
  return bust > 0 ? `${base}?t=${bust}` : base;
}

/**
 * Variante vía PHP no-store (local / cuando el archivo esté en el hosting).
 * Preferí `rhAvatarUrl` en la UI hasta que media/avatar.php esté desplegado.
 */
export function rhUserAvatarUrl(userId: number, bust = 0): string {
  const q = bust > 0 ? `&v=${bust}` : '';
  return `${apiBaseUrl()}/ajax/media/avatar.php?u=${userId}${q}`;
}

/**
 * Copia la imagen a un data-URI base64 propio.
 * No usamos blob: — en web se invalida solo y la UI volvía a la foto cacheada.
 */
export async function makeDurableImageUri(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]!;
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    base64 += chars[b1 >> 2];
    base64 += chars[((b1 & 0x03) << 4) | (b2 !== undefined ? b2 >> 4 : 0)];
    base64 += b2 !== undefined ? chars[((b2 & 0x0f) << 2) | (b3 !== undefined ? b3 >> 6 : 0)] : '=';
    base64 += b3 !== undefined ? chars[b3 & 0x3f] : '=';
  }
  return `data:${mime};base64,${base64}`;
}

/**
 * Descarga una imagen protegida (requiere Authorization: Bearer) y devuelve
 * un URI que <Image source={{uri}}> puede consumir directamente:
 * - Web: un object URL (URL.createObjectURL) sobre el Blob descargado.
 * - Nativo: un data URI en base64 (evita depender de expo-file-system para
 *   un archivo temporal; aceptable dado el cap de 8MB en las validaciones
 *   del backend).
 * Devuelve null si la descarga falla (403/404/etc).
 */
export async function fetchAuthenticatedImageUri(url: string, token: string | null): Promise<string | null> {
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      return null;
    }

    const mime = (response.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    // Si el PHP mandó JSON de error (o HTML) con status raro, no lo pintamos como imagen.
    if (mime && !mime.startsWith('image/')) {
      return null;
    }

    if (Platform.OS === 'web') {
      const blob = await response.blob();
      if (!blob.type.startsWith('image/') && blob.size < 32) {
        return null;
      }
      return URL.createObjectURL(blob);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 32) {
      return null;
    }
    const base64 = base64FromArrayBuffer(buffer);
    return `data:${mime || 'image/jpeg'};base64,${base64}`;
  } catch {
    return null;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Codificador base64 manual: evita depender de btoa (no disponible en Hermes/RN) o de Buffer (Node-only). */
function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 0x03) << 4) | (b2 !== undefined ? b2 >> 4 : 0)];
    result += b2 !== undefined ? BASE64_CHARS[((b2 & 0x0f) << 2) | (b3 !== undefined ? b3 >> 6 : 0)] : '=';
    result += b3 !== undefined ? BASE64_CHARS[b3 & 0x3f] : '=';
  }
  return result;
}
