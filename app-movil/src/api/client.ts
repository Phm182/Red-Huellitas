import { Platform } from 'react-native';
import { ApiResponse } from '../types';

/**
 * En web del mismo subdominio: `/inc` (o EXPO_PUBLIC_API_URL al buildear).
 * En nativo / Expo Go: env o localhost XAMPP.
 */
function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/inc`;
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
    return { success: false, message: 'No se pudo conectar con el servidor', data: null };
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch (e) {
    return { success: false, message: 'Respuesta inválida del servidor', data: null };
  }

  return json;
}

export const apiGet = <T>(path: string, params?: Record<string, unknown>, auth = false) =>
  request<T>(path, { method: 'GET', body: params, auth });

export const apiPost = <T>(path: string, body?: Record<string, unknown> | FormData, auth = false) =>
  request<T>(path, { method: 'POST', body, auth });

export function apiBaseUrl() {
  return getApiUrl();
}
