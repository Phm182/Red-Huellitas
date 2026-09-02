import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/authApi';
import { setApiToken } from '../api/client';
import { Usuario } from '../types';
import {
  clearStoredAccounts,
  loadStoredAccounts,
  removeStoredAccount,
  StoredAccount,
  upsertStoredAccount,
} from './accountsStorage';
import { secureStorage } from './secureStorage';
import { clearAvatarCache, loadAvatarCache } from '../utils/avatarCache';
import { clearAvatarDisplay, setAvatarDisplay } from '../utils/avatarDisplayStore';

const TOKEN_KEY = 'red_huellitas_token';

/** Si hay preview local guardada para este usuario, restaurarla (sobrevive reload + CDN viejo). */
async function hydrateAvatarPreview(nextUser: Usuario): Promise<void> {
  const cache = await loadAvatarCache();
  if (!cache || cache.userId !== nextUser.userId) {
    return;
  }
  // Siempre preferir la preview propia guardada: en Hostinger el JPG fijo
  // (ej. avatares/2.jpg) queda cacheado en el CDN aunque el archivo cambió.
  setAvatarDisplay(cache.dataUri, cache.path || nextUser.avatarPath);
}

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: Usuario | null;
  /** Cuentas guardadas en el dispositivo (la activa es la del `user` actual). */
  accounts: StoredAccount[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registro: (
    email: string,
    password: string,
    nombreCompleto: string,
    aceptaClausula: boolean,
    tipoUsuarioCodigo: string,
    fechaNacimiento: string
  ) => Promise<{ success: boolean; message: string }>;
  loginConGoogle: (idToken: string) => Promise<{ success: boolean; message: string }>;
  /** Cierra sólo la cuenta activa; si hay otra, pasa a esa. */
  logout: () => Promise<void>;
  /** Cierra todas las cuentas del dispositivo. */
  logoutAll: () => Promise<void>;
  switchAccount: (userId: number) => Promise<{ success: boolean; message: string }>;
  actualizarUsuario: (user: Usuario) => void;
  /** Se incrementa al cambiar el avatar (misma ruta de archivo → hay que bustear cache). */
  avatarBust: number;
  /** Preview local (blob/file) tras elegir foto; tiene prioridad sobre la URL del servidor. */
  avatarPreviewUri: string | null;
  setAvatarPreviewUri: (uri: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [avatarBust, setAvatarBust] = useState(0);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const activateSession = useCallback(async (nextToken: string, nextUser: Usuario) => {
    await secureStorage.setItem(TOKEN_KEY, nextToken);
    setApiToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser.avatarBust) {
      setAvatarBust(nextUser.avatarBust);
    }
    await hydrateAvatarPreview(nextUser);
    const list = await upsertStoredAccount({ token: nextToken, user: nextUser });
    setAccounts(list);
  }, []);

  useEffect(() => {
    (async () => {
      const savedAccounts = await loadStoredAccounts();
      setAccounts(savedAccounts);

      const savedToken = await secureStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        setApiToken(savedToken);
        setToken(savedToken);
        // Mostrar de entrada el perfil cacheado (offline-first): si /me tarda o
        // falla por red, el usuario no debe ver una pantalla de login de la nada.
        const cachedAccount = savedAccounts.find((a) => a.token === savedToken);
        if (cachedAccount) {
          setUser(cachedAccount.user);
          if (cachedAccount.user.avatarBust) {
            setAvatarBust(cachedAccount.user.avatarBust);
          }
          await hydrateAvatarPreview(cachedAccount.user);
        }

        const res = await authApi.me();
        if (res.success && res.data) {
          setUser(res.data.user);
          if (res.data.user.avatarBust) {
            setAvatarBust(res.data.user.avatarBust);
          }
          await hydrateAvatarPreview(res.data.user);
          const list = await upsertStoredAccount({ token: savedToken, user: res.data.user });
          setAccounts(list);
        } else if (res.status === 401) {
          // Acá sí es un rechazo real del servidor (token revocado/expirado en
          // UsuarioSesion): recién ahí tiene sentido sacar la cuenta y pedir login.
          const fromList = savedAccounts.find((a) => a.token === savedToken);
          let restantes = savedAccounts;
          if (fromList) {
            restantes = await removeStoredAccount(fromList.user.userId);
          }
          let recuperado = false;
          for (const cuenta of restantes) {
            setApiToken(cuenta.token);
            const me = await authApi.me();
            if (me.success && me.data) {
              await activateSession(cuenta.token, me.data.user);
              recuperado = true;
              break;
            }
            if (me.status === 401) {
              restantes = await removeStoredAccount(cuenta.user.userId);
              setAccounts(restantes);
            }
            // Si fue error de red (status 0 o 5xx) dejamos esa cuenta guardada
            // tal cual y probamos con la próxima, sin descartarla.
          }
          if (!recuperado) {
            setApiToken(null);
            setToken(null);
            setUser(null);
            if (restantes.length === 0) {
              await secureStorage.deleteItem(TOKEN_KEY);
              await clearStoredAccounts();
            }
            setAccounts(restantes);
          }
        }
        // else: fallo de red/servidor (status 0, 5xx, JSON roto). No se toca la
        // sesión guardada — ya quedó mostrado el perfil cacheado de arriba, y el
        // token sigue activo para que la próxima request lo reintente solo.
      } else if (savedAccounts.length > 0) {
        // Había cuentas pero no token activo: activar la primera válida.
        let recuperado = false;
        let restantes = savedAccounts;
        for (const cuenta of savedAccounts) {
          setApiToken(cuenta.token);
          const me = await authApi.me();
          if (me.success && me.data) {
            await activateSession(cuenta.token, me.data.user);
            recuperado = true;
            break;
          }
          if (me.status === 401) {
            restantes = await removeStoredAccount(cuenta.user.userId);
            setAccounts(restantes);
            continue;
          }
          // Sin red/servidor caído: no tiene sentido seguir probando cuenta por
          // cuenta ni borrar nada — sólo no queda ninguna activa por ahora.
          setApiToken(null);
          break;
        }
        if (!recuperado) {
          setApiToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      await activateSession(res.data.token, res.data.user);
    }
    return { success: res.success, message: res.message };
  };

  const registro = async (
    email: string,
    password: string,
    nombreCompleto: string,
    aceptaClausula: boolean,
    tipoUsuarioCodigo: string,
    fechaNacimiento: string
  ) => {
    const res = await authApi.registro(
      email,
      password,
      nombreCompleto,
      aceptaClausula,
      tipoUsuarioCodigo,
      fechaNacimiento
    );
    if (res.success && res.data) {
      await activateSession(res.data.token, res.data.user);
    }
    return { success: res.success, message: res.message };
  };

  const loginConGoogle = async (idToken: string) => {
    const res = await authApi.googleLogin(idToken);
    if (res.success && res.data) {
      await activateSession(res.data.token, res.data.user);
    }
    return { success: res.success, message: res.message };
  };

  const logout = async () => {
    const activeId = user?.userId;
    if (token) {
      try {
        await authApi.logout();
      } catch {
        // Si el token ya no sirve, igual limpiamos local.
      }
    }

    let restantes = accounts;
    if (activeId != null) {
      restantes = await removeStoredAccount(activeId);
    }

    if (restantes.length > 0) {
      const siguiente = restantes[0];
      setApiToken(siguiente.token);
      const me = await authApi.me();
      if (me.success && me.data) {
        await activateSession(siguiente.token, me.data.user);
        return;
      }
      if (me.status === 401) {
        // Esa cuenta también está vencida/revocada de verdad: sacarla.
        restantes = await removeStoredAccount(siguiente.user.userId);
        if (restantes.length === 0) {
          await clearStoredAccounts();
        }
      }
      // Si fue error de red, dejamos esa cuenta guardada para reintentar más
      // tarde — no hay forma de confirmarla sin conexión, pero tampoco hay
      // que borrarla. De cualquier forma no queda ninguna cuenta activa ahora.
    }

    await secureStorage.deleteItem(TOKEN_KEY);
    setApiToken(null);
    setToken(null);
    setUser(null);
    setAccounts(restantes);
    setAvatarPreviewUri(null);
    clearAvatarDisplay();
    await clearAvatarCache();
  };

  const logoutAll = async () => {
    if (token) {
      try {
        await authApi.logout();
      } catch {
        // ignore
      }
    }
    await clearStoredAccounts();
    await secureStorage.deleteItem(TOKEN_KEY);
    setApiToken(null);
    setToken(null);
    setUser(null);
    setAccounts([]);
    setAvatarPreviewUri(null);
    clearAvatarDisplay();
    await clearAvatarCache();
  };

  const switchAccount = async (userId: number) => {
    if (user?.userId === userId) {
      return { success: true, message: '' };
    }
    const cuenta = accounts.find((a) => a.user.userId === userId);
    if (!cuenta) {
      return { success: false, message: 'Cuenta no encontrada' };
    }

    setAvatarPreviewUri(null);
    clearAvatarDisplay();
    setApiToken(cuenta.token);
    const me = await authApi.me();
    if (me.success && me.data) {
      await activateSession(cuenta.token, me.data.user);
      return { success: true, message: '' };
    }

    // Restaurar el token de la sesión que sí estaba activa antes de intentar el cambio.
    if (token) setApiToken(token);

    if (me.status === 401) {
      // Rechazo real del servidor: esa cuenta ya no sirve, sacarla de la lista.
      const restantes = await removeStoredAccount(userId);
      setAccounts(restantes);
      return { success: false, message: me.message || 'No se pudo cambiar de cuenta' };
    }

    // Error de red/servidor: no borrar la cuenta, sólo avisar que no se pudo confirmar ahora.
    return { success: false, message: 'Sin conexión, no se pudo cambiar de cuenta. Probá de nuevo.' };
  };

  const actualizarUsuario = (updated: Usuario) => {
    if (updated.avatarPath) {
      setAvatarBust(updated.avatarBust ?? Date.now());
    }
    setUser(updated);
    if (token) {
      upsertStoredAccount({ token, user: updated }).then(setAccounts);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        token,
        user,
        accounts,
        login,
        registro,
        loginConGoogle,
        logout,
        logoutAll,
        switchAccount,
        actualizarUsuario,
        avatarBust,
        avatarPreviewUri,
        setAvatarPreviewUri,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
