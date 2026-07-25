import { Platform, Share } from 'react-native';

interface CompartirPostParams {
  texto?: string | null;
  url: string;
}

/**
 * Abre el selector nativo de compartir del sistema (WhatsApp/Instagram
 * aparecen ahí si el usuario los tiene instalados) — no es una integración
 * directa con las APIs de esas plataformas, ver decisión de Fase 3a.
 */
export async function compartirPost({ texto, url }: CompartirPostParams): Promise<void> {
  const mensaje = texto ? `${texto}\n\n${url}` : url;

  if (Platform.OS !== 'web') {
    await Share.share({ message: mensaje, url });
    return;
  }

  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (typeof nav.share === 'function') {
    await nav.share({ text: texto ?? undefined, url });
    return;
  }

  // Fallback web sin Web Share API: abre WhatsApp Web con el texto prellenado.
  const textoWhatsapp = encodeURIComponent(mensaje);
  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/?text=${textoWhatsapp}`, '_blank');
  }
}
