import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { publicacionesApi } from '../api/publicacionesApi';
import { useAuth } from '../auth/AuthProvider';
import { Post, ReaccionTipo } from '../types';
import { compartirPost } from '../utils/compartir';
import { useSeguirToggle } from './useSeguirToggle';

/**
 * Lógica de reacción/seguir/compartir/eliminar de un Post, extraída de
 * PostCard para reusarla también en ShortCard (un Short es un Post con
 * video, mismas acciones, presentación distinta).
 */
export function usePostActions(post: Post, onEliminado?: (postId: number) => void) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [miReaccion, setMiReaccion] = useState(post.miReaccion);
  const [conteos, setConteos] = useState(post.conteos);
  const [reaccionBusy, setReaccionBusy] = useState(false);

  const { siguiendo, busy: siguiendoBusy, toggle: onToggleSeguir } = useSeguirToggle(
    post.autor?.userId ?? 0,
    post.autorSeguido
  );

  const esDueno = post.esDueno || (user && post.autor && user.userId === post.autor.userId);

  const onReaccionar = async (tipo: ReaccionTipo) => {
    if (reaccionBusy) return;
    setReaccionBusy(true);
    const res =
      miReaccion === tipo
        ? await publicacionesApi.quitarReaccion(post.postId)
        : await publicacionesApi.reaccionar(post.postId, tipo);
    if (res.success && res.data) {
      setMiReaccion(res.data.miReaccion);
      setConteos(res.data.conteos);
    }
    setReaccionBusy(false);
  };

  const onCompartir = () => {
    // Deep link con el esquema propio de la app (redhuellitas://) — no hay
    // todavía una URL web pública desplegada donde este post sea accesible
    // fuera de la app, así que no fabricamos un link http:// que no resuelve.
    compartirPost({
      texto: post.texto,
      url: Linking.createURL(`/publicaciones/${post.postId}`),
    });
  };

  const onEliminar = () => {
    Alert.alert(t('feed.deleteConfirmTitle'), t('feed.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await publicacionesApi.eliminar(post.postId);
          if (res.success) {
            onEliminado?.(post.postId);
          }
        },
      },
    ]);
  };

  return {
    miReaccion,
    conteos,
    reaccionBusy,
    onReaccionar,
    siguiendo,
    siguiendoBusy,
    onToggleSeguir,
    esDueno,
    onCompartir,
    onEliminar,
  };
}
