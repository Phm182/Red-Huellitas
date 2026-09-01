import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { comentariosApi } from '../../../src/api/comentariosApi';
import { publicacionesApi } from '../../../src/api/publicacionesApi';
import { LogoSiluetaNegra } from '../../../src/components/LogoImage';
import { PostCard } from '../../../src/components/PostCard';
import { Comentario, Post } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { hapticLeve } from '../../../src/utils/haptics';

export default function PublicacionDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      Promise.all([publicacionesApi.obtener(postId), comentariosApi.listar(postId)]).then(
        ([resPost, resComentarios]) => {
          if (!activo) return;
          if (resPost.success && resPost.data) {
            setPost(resPost.data.post);
          } else {
            setNotFound(true);
          }
          if (resComentarios.success && resComentarios.data) {
            setComentarios(resComentarios.data.comentarios);
            setNextCursor(resComentarios.data.nextCursor);
          }
          setLoading(false);
        }
      );
      return () => {
        activo = false;
      };
    }, [postId])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await comentariosApi.listar(postId, nextCursor);
    setCargandoMas(false);
    if (res.success && res.data) {
      setComentarios((prev) => [...prev, ...res.data!.comentarios]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const onEliminado = () => {
    router.replace('/(app)/(tabs)');
  };

  const enviarComentario = async () => {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    hapticLeve();
    const res = await comentariosApi.crear(postId, limpio);
    setEnviando(false);
    if (res.success && res.data) {
      setTexto('');
      inputRef.current?.blur();
      setComentarios((prev) => [res.data!.comentario, ...prev]);
      setPost((prev) => (prev ? { ...prev, totalComentarios: prev.totalComentarios + 1 } : prev));
    }
  };

  const eliminarComentario = (comentarioId: number) => {
    Alert.alert(
      t('feed.comentarioEliminarConfirmTitle'),
      t('feed.comentarioEliminarConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('feed.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            const res = await comentariosApi.eliminar(comentarioId);
            if (res.success) {
              setComentarios((prev) => prev.filter((c) => c.comentarioId !== comentarioId));
              setPost((prev) => (prev ? { ...prev, totalComentarios: Math.max(0, prev.totalComentarios - 1) } : prev));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notFound || !post) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>{t('feed.postNotFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={comentarios}
        keyExtractor={(c) => String(c.comentarioId)}
        contentContainerStyle={[styles.lista, centeredContent]}
        ListHeaderComponent={
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <PostCard post={post} onEliminado={onEliminado} />
            <Text style={[type.titleSm, { color: colors.text, marginBottom: 8 }]}>
              {t('feed.comentariosTitulo')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 8 }}>
            {t('feed.comentarioVacio')}
          </Text>
        }
        ListFooterComponent={
          nextCursor !== null ? (
            <Pressable onPress={cargarMas} style={styles.cargarMas} disabled={cargandoMas}>
              {cargandoMas ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                  {t('feed.loadingMore')}
                </Text>
              )}
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.comentarioFila}>
            {item.autor?.avatarPath ? (
              <Image source={{ uri: rhMediaUrl(item.autor.avatarPath) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
                <LogoSiluetaNegra style={{ width: 14, height: 14 }} />
              </View>
            )}
            <View style={[styles.comentarioBurbuja, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>
                {item.autor?.nombreCompleto ?? '@' + (item.autor?.username ?? '')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>{item.texto}</Text>
            </View>
            {item.esDueno || post.esDueno ? (
              <Pressable onPress={() => eliminarComentario(item.comentarioId)} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        )}
      />

      <View style={[styles.barra, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          value={texto}
          onChangeText={setTexto}
          placeholder={t('feed.comentarPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          multiline
        />
        <Pressable
          onPress={enviarComentario}
          disabled={!texto.trim() || enviando}
          style={[styles.enviar, { backgroundColor: colors.primary }, (!texto.trim() || enviando) && { opacity: 0.4 }]}
        >
          <Ionicons name="send" size={17} color={colors.primaryText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lista: { flexGrow: 1, paddingBottom: 20 },
  cargarMas: { alignItems: 'center', paddingVertical: 10 },
  comentarioFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  comentarioBurbuja: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 110,
  },
  enviar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
