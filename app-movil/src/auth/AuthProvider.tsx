import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/authApi';
import { setApiToken } from '../api/client';
import { Usuario } from '../types';
import { secureStorage } from './secureStorage';

const TOKEN_KEY = 'red_huellitas_token';

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: Usuario | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registro: (
    email: string,
    password: string,
    nombreCompleto: string,
    aceptaClausula: boolean,
    tipoUsuarioCodigo: string
  ) => Promise<{ success: boolean; message: string }>;
  loginConGoogle: (idToken: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  actualizarUsuario: (user: Usuario) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    (async () => {
      const savedToken = await secureStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        setApiToken(savedToken);
        setToken(savedToken);
        const res = await authApi.me();
        if (res.success && res.data) {
          setUser(res.data.user);
        } else {
          // Token inválido/expirado: limpiar sesión local.
          await secureStorage.deleteItem(TOKEN_KEY);
          setApiToken(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const applyAuthResult = async (result: { token: string; user: Usuario }) => {
    await secureStorage.setItem(TOKEN_KEY, result.token);
    setApiToken(result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      await applyAuthResult(res.data);
    }
    return { success: res.success, message: res.message };
  };

  const registro = async (
    email: string,
    password: string,
    nombreCompleto: string,
    aceptaClausula: boolean,
    tipoUsuarioCodigo: string
  ) => {
    const res = await authApi.registro(email, password, nombreCompleto, aceptaClausula, tipoUsuarioCodigo);
    if (res.success && res.data) {
      await applyAuthResult(res.data);
    }
    return { success: res.success, message: res.message };
  };

  const loginConGoogle = async (idToken: string) => {
    const res = await authApi.googleLogin(idToken);
    if (res.success && res.data) {
      await applyAuthResult(res.data);
    }
    return { success: res.success, message: res.message };
  };

  const logout = async () => {
    if (token) {
      await authApi.logout();
    }
    await secureStorage.deleteItem(TOKEN_KEY);
    setApiToken(null);
    setToken(null);
    setUser(null);
  };

  const actualizarUsuario = (updated: Usuario) => setUser(updated);

  return (
    <AuthContext.Provider
      value={{ isLoading, token, user, login, registro, loginConGoogle, logout, actualizarUsuario }}
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
