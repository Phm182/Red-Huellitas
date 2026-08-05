import { apiGet, apiPost } from './client';
import { Usuario } from '../types';

interface AuthResult {
  token: string;
  user: Usuario;
}

export const authApi = {
  registro: (
    email: string,
    password: string,
    nombreCompleto: string,
    aceptaClausulaAntiCriaderos: boolean,
    tipoUsuarioCodigo: string,
    fechaNacimiento: string
  ) =>
    apiPost<AuthResult>('ajax/auth/registro.php', {
      email,
      password,
      nombreCompleto,
      aceptaClausulaAntiCriaderos: aceptaClausulaAntiCriaderos ? '1' : '0',
      tipoUsuarioCodigo,
      fechaNacimiento,
    }),

  /**
   * Backfill para cuentas creadas antes de que existiera el campo. Se puede
   * cargar una sola vez: si fuera editable, un menor con el chat restringido
   * se pondría 30 años y quedaría sin protección.
   */
  guardarFechaNacimiento: (fechaNacimiento: string) =>
    apiPost<{ fechaNacimiento: string; edad: number; esMenor: boolean }>(
      'ajax/perfil/fecha_nacimiento_guardar.php',
      { fechaNacimiento },
      true
    ),

  login: (email: string, password: string) => apiPost<AuthResult>('ajax/auth/login.php', { email, password }),

  googleLogin: (idToken: string) => apiPost<AuthResult>('ajax/auth/google_login.php', { idToken }),

  passwordOlvidada: (email: string) =>
    apiPost<{ emailEnviado: boolean; debugCodigo?: string | null }>('ajax/auth/password_olvidada.php', { email }),

  passwordRestablecer: (email: string, codigo: string, password: string) =>
    apiPost<null>('ajax/auth/password_restablecer.php', { email, codigo, password }),

  logout: () => apiPost<null>('ajax/auth/logout.php', undefined, true),

  checkUsername: (username: string) =>
    apiGet<{ available: boolean }>('ajax/auth/check_username.php', { username }),

  me: () => apiGet<{ user: Usuario }>('ajax/auth/me.php', undefined, true),

  guardarOnboarding: (params: {
    username: string;
    zonaLat: number;
    zonaLng: number;
    zonaDescripcion: string;
    aceptaClausulaAntiCriaderos?: boolean;
  }) =>
    apiPost<{ user: Usuario }>(
      'ajax/auth/onboarding_guardar.php',
      {
        username: params.username,
        zonaLat: params.zonaLat,
        zonaLng: params.zonaLng,
        zonaDescripcion: params.zonaDescripcion,
        aceptaClausulaAntiCriaderos: params.aceptaClausulaAntiCriaderos ? '1' : '0',
      },
      true
    ),
};
