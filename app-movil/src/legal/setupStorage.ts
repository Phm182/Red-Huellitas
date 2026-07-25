import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETUP_STORAGE_KEY = '@red_huellitas/setup_completo';

export async function isSetupCompleto(): Promise<boolean> {
  const v = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
  return v === '1';
}

export async function marcarSetupCompleto(): Promise<void> {
  await AsyncStorage.setItem(SETUP_STORAGE_KEY, '1');
}
