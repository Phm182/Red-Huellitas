import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * expo-secure-store no tiene implementación funcional en web (Keychain/Keystore
 * no existen ahí), así que en web usamos AsyncStorage (localStorage) como
 * fallback. En nativo (iOS/Android) se usa SecureStore real.
 */
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  getItem: (key: string): Promise<string | null> => (isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)),
  setItem: (key: string, value: string): Promise<void> =>
    isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string): Promise<void> => (isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};
