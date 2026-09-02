import { Platform } from 'react-native';
import { ApiResponse } from '../types';

/**
 * Backend PHP.
 * - Navegador en localhost → siempre XAMPP local (ignora bitflow del .env.production).
 * - Sitio hosteado → mismo origen /inc.
 * - Nativo → EXPO_PUBLIC_API_URL del .env.
 */
function getApiUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost/Red%20Huellitas/inc';
    }
    // Web export en el hosting: PHP vive en /inc del mismo dominio.
    if (host.includes('bitflow.com.ar') || host.includes('redhuellitas')) {
      return `${window.location.origin}/inc`;
    }
  }

  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) {
    // Se puede poner la raíz del sitio; el backend PHP vive en /inc.
    return fromEnv.endsWith('/inc') ? fromEnv : `${fromEnv}/inc`;
  }
  return 'http://localhost/Red%20Huellitas/inc';
}

let currentToken: string | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, auth = false } = options;
  const API_URL = getApiUrl();

  const headers: Record<string, string> = {};
  if (auth && currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  let url = `${API_URL}/${path}`;
  let requestBody: BodyInit | undefined;

  if (method === 'GET') {
    if (body && !(body instanceof FormData)) {
      url += `?${new URLSearchParams(body as Record<string, string>).toString()}`;
    }
  } else if (body instanceof FormData) {
    requestBody = body;
  } else if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    requestBody = new URLSearchParams(body as Record<string, string>).toString();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
  } catch (e) {
    const hint =
      Platform.OS === 'web'
        ? `No se pudo conectar con ${API_URL}. Si estás en la PC abrí http://localhost:8081 (Expo), no el sitio de bitflow. ¿XAMPP/Apache encendido?`
        : `No se pudo conectar con ${API_URL}.`;
    // status: 0 = nunca hubo respuesta del servidor (sin red, timeout, DNS).
    // Importante distinguirlo de un 401 real: quien llama (ej. AuthProvider al
    // reabrir la app) no debe borrar una sesión válida sólo porque no hubo wifi.
    return { success: false, message: hint, data: null, status: 0 };
  }

  let json: ApiResponse<T>;
  try {
    // Hostinger/Windows a veces manda UTF-8 BOM (EF BB BF) delante del JSON.
    const raw = await response.text();
    const cleaned = raw.replace(/^\uFEFF/, '').trim();
    if (!cleaned) {
      return {
        success: false,
        message: `Servidor sin respuesta (HTTP ${response.status}). Revisá límites de subida o el endpoint.`,
        data: null,
        status: response.status,
      };
    }
    json = JSON.parse(cleaned) as ApiResponse<T>;
  } catch (e) {
    const hint =
      response.status === 413
        ? 'El archivo es demasiado grande para el servidor.'
        : response.status >= 500
          ? 'Error interno del servidor al subir.'
          : 'Respuesta inválida del servidor (¿SQL 022 OverlayJson o PHP desactualizado?).';
    // Igual que arriba: acá sí hubo respuesta del servidor (tenemos response.status
    // real), sólo que el body no se pudo parsear. Tampoco es un 401 de verdad.
    return { success: false, message: hint, data: null, status: response.status };
  }

  return { ...json, status: response.status };
}

export const apiGet = <T>(path: string, params?: Record<string, unknown>, auth = false) =>
  request<T>(path, { method: 'GET', body: params, auth });

export const apiPost = <T>(path: string, body?: Record<string, unknown> | FormData, auth = false) =>
  request<T>(path, { method: 'POST', body, auth });

export function apiBaseUrl() {
  return getApiUrl();
}
