import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preview durable del avatar propio (data-URI) para sobrevivir un reload
 * mientras el CDN/browser cachean el JPG viejo de /uploads/.
 * Solo se guarda tras un upload confirmado por el servidor.
 */
const KEY = 'red_huellitas_avatar_cache';

export type AvatarCacheEntry = {
  userId: number;
  path: string;
  bust: number;
  dataUri: string;
};

export async function loadAvatarCache(): Promise<AvatarCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AvatarCacheEntry;
    if (
      !parsed ||
      typeof parsed.userId !== 'number' ||
      typeof parsed.path !== 'string' ||
      typeof parsed.dataUri !== 'string' ||
      !parsed.dataUri.startsWith('data:image/')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAvatarCache(entry: AvatarCacheEntry): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entry));
}

export async function clearAvatarCache(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
