import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '../types';

/**
 * Cuentas guardadas para cambio rápido de usuario.
 * Vive en AsyncStorage (no SecureStore) porque la lista puede superar el
 * tope de ~2KB de Keychain y porque en web el token ya iba a AsyncStorage.
 */
const ACCOUNTS_KEY = 'red_huellitas_accounts';

export type StoredAccount = {
  token: string;
  user: Usuario;
};

export async function loadStoredAccounts(): Promise<StoredAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is StoredAccount =>
        a &&
        typeof a.token === 'string' &&
        a.token.length > 0 &&
        a.user &&
        typeof a.user.userId === 'number'
    );
  } catch {
    return [];
  }
}

export async function saveStoredAccounts(accounts: StoredAccount[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Inserta o actualiza por userId y lo deja primero (activo). */
export async function upsertStoredAccount(account: StoredAccount): Promise<StoredAccount[]> {
  const actuales = await loadStoredAccounts();
  const sinDup = actuales.filter((a) => a.user.userId !== account.user.userId);
  const next = [account, ...sinDup];
  await saveStoredAccounts(next);
  return next;
}

export async function removeStoredAccount(userId: number): Promise<StoredAccount[]> {
  const next = (await loadStoredAccounts()).filter((a) => a.user.userId !== userId);
  await saveStoredAccounts(next);
  return next;
}

export async function clearStoredAccounts(): Promise<void> {
  await AsyncStorage.removeItem(ACCOUNTS_KEY);
}
