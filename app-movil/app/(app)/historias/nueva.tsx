import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { historiasApi } from '../../../src/api/historiasApi';
import { CapturedStoryMedia, StoryCameraCapture } from '../../../src/stories/StoryCameraCapture';
import { StoryEditor, StoryPublicacion } from '../../../src/stories/StoryEditor';
import { overlayHasContent } from '../../../src/stories/storyEditorTypes';

function safeGoBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(app)/(tabs)');
  }
}

export default function NuevaHistoriaScreen() {
  const { t } = useTranslation();
  // Se llega acá con ?cadenaId= al tocar "Continuar cadena" desde el visor o
  // desde la pantalla de la cadena.
  const { cadenaId } = useLocalSearchParams<{ cadenaId?: string }>();
  const cadenaIdNum = cadenaId ? Number(cadenaId) : null;

  const [media, setMedia] = useState<CapturedStoryMedia | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Bloquear scroll del body en web (historias son viewport fijo).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, []);

  const mostrarError = (mensaje: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(mensaje);
      return;
    }
    Alert.alert(t('common.error'), mensaje);
  };

  const onPublish = async (publicacion: StoryPublicacion) => {
    if (!media || publishing) return;
    setPublishing(true);
    try {
      const extras = {
        overlay: overlayHasContent(publicacion.overlay) ? publicacion.overlay : null,
        // El recorte y el audio sólo aplican a video; en una foto no
        // significan nada y ensuciarían la fila.
        recorte: media.tipo === 'video' ? publicacion.recorte : null,
        sinAudio: media.tipo === 'video' ? publicacion.sinAudio : false,
        cadenaId: cadenaIdNum,
      };

      const res =
        media.tipo === 'video'
          ? await historiasApi.crear('video', media.uri, media.duracionSegundos, media.mimeType, extras)
          : await historiasApi.crear('foto', media.uri, undefined, undefined, extras);

      if (res.success) {
        // Al publicar en una cadena se vuelve a la cadena, que es el contexto
        // del que venía; si no, al feed.
        router.replace((cadenaIdNum ? `/(app)/cadenas/${cadenaIdNum}` : '/(app)/(tabs)') as never);
      } else {
        mostrarError(res.message || t('historias.uploadFailed'));
      }
    } catch (e) {
      mostrarError(e instanceof Error ? e.message : t('historias.uploadFailed'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.root}>
      {!media ? (
        <StoryCameraCapture onCaptured={setMedia} onClose={safeGoBack} />
      ) : (
        <StoryEditor
          media={media}
          onBack={() => setMedia(null)}
          onPublish={onPublish}
          publishing={publishing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          maxHeight: '100vh',
        } as object)
      : null),
  },
});
