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

    if (Platform.OS === 'web') {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    const mime = response.headers.get('Content-Type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = base64FromArrayBuffer(buffer);
    return `data:${mime};base64,${base64}`;
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
