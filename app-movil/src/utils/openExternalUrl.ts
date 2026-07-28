import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Abre una URL externa sin reemplazar la app (web: pestaña nueva).
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  }
}
