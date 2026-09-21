import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { chatApi } from '../../../src/api/chatApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { ChatMensaje, ChatOtro } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { convertirEmoticones } from '../../../src/utils/emoticones';
import { StickerPicker } from '../../../src/chat/StickerPicker';
import { StickerImagen, StickerId } from '../../../src/chat/stickers';
import { hapticExito, hapticLeve, hapticMedio } from '../../../src/utils/haptics';
import { rhAvatarUrl, rhMediaUrl } from '../../../src/utils/media';

/** Emoji con el que se muestra cada reacción a una historia dentro del chat. */
const EMOJI_REACCION: Record<string, string> = {
  huella: '🐾',
  amor: '❤️',
  divertido: '😂',
  asombro: '😮',
  triste: '😢',
  abrazo: '🤗',
  guau: '🐶',
  michi: '🐱',
};

/** Cada cuánto se pregunta por mensajes nuevos con la charla abierta. */
const POLL_MS = 4000;

/**
 * Aire debajo de la barra de escribir para que quede por encima del botón del
 * planeta (Mapa), que sobresale de la barra de pestañas y tapaba el campo de
 * texto. Es el mismo aire que lleva la hoja del mapa. Con el teclado abierto
 * no hace falta: el planeta queda tapado por el teclado.
 */
const AIRE_PLANETA = 24;

export default function ConversacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  // Se puede entrar por conversación existente o por usuario. Lo segundo lo
  // usa el tab de equipos: ahí se sabe a quién escribirle, no si ya existe la
  // charla, y `abrir.php` busca-o-crea.
  const { conversacionId, userId } = useLocalSearchParams<{
    conversacionId: string;
    userId?: string;
  }>();
  const convIdParam = Number(conversacionId);
  const userIdParam = userId ? Number(userId) : null;

  // Cuando se entra por usuario, el id real llega en la respuesta de `abrir`.
  const [convId, setConvId] = useState(Number.isFinite(convIdParam) ? convIdParam : 0);

  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [otro, setOtro] = useState<ChatOtro | null>(null);
  const [estado, setEstado] = useState<string>('activa');
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [tecladoAbierto, setTecladoAbierto] = useState(false);

  const listaRef = useRef<FlatList<ChatMensaje>>(null);
  const ultimoIdRef = useRef(0);
  const zumbidoVistoRef = useRef(0);

  // El sacudón del zumbido: la pantalla entera se mueve, como el MSN.
  const sacudir = useSharedValue(0);
  const estiloSacudida = useAnimatedStyle(() => ({
    transform: [{ translateX: sacudir.value }],
  }));

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const a = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setTecladoAbierto(true));
    const b = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setTecladoAbierto(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const aireBajo = tecladoAbierto ? 0 : AIRE_PLANETA;

  const dispararZumbido = useCallback(() => {
    hapticMedio();
    // El vuelta-a-cero va encadenado con withSequence, NO en la callback de
    // withRepeat: asignarle un valor nuevo a `sacudir` desde su propia callback
    // de fin se retroalimenta y revienta con "Maximum call stack size
    // exceeded". Encadenado, la animación termina sola en 0.
    sacudir.value = withSequence(
      withRepeat(
        withSequence(withTiming(-10, { duration: 45 }), withTiming(10, { duration: 45 })),
        6,
        true
      ),
      withTiming(0, { duration: 60 })
    );
  }, [sacudir]);

  const aplicarMensajes = useCallback(
    (nuevos: ChatMensaje[], reemplazar: boolean) => {
      if (nuevos.length === 0) return;
      setMensajes((prev) => (reemplazar ? nuevos : [...prev, ...nuevos]));
      ultimoIdRef.current = nuevos[nuevos.length - 1].mensajeId;

      // Sacude sólo si el zumbido lo mandó el otro y no lo vimos antes.
      const zumbido = [...nuevos]
        .reverse()
        .find((m) => m.tipo === 'zumbido' && m.userIdEmisor !== user?.userId);
      if (zumbido && zumbido.mensajeId > zumbidoVistoRef.current) {
        zumbidoVistoRef.current = zumbido.mensajeId;
        dispararZumbido();
      }
    },
    [dispararZumbido, user?.userId]
  );

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      const porUsuario = !Number.isFinite(convIdParam) || convIdParam <= 0;
      chatApi
        .abrir(porUsuario ? { userId: userIdParam ?? 0 } : { conversacionId: convIdParam })
        .then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setConvId(res.data.conversacionId);
          setOtro(res.data.otro);
          setEstado(res.data.estado);
          // En la carga inicial no se sacude por zumbidos viejos.
          zumbidoVistoRef.current = res.data.mensajes.length
            ? res.data.mensajes[res.data.mensajes.length - 1].mensajeId
            : 0;
          setMensajes(res.data.mensajes);
          ultimoIdRef.current = zumbidoVistoRef.current;
          if (res.data.conversacionId > 0) void chatApi.marcarLeida(res.data.conversacionId);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [convIdParam, userIdParam])
  );

  /**
   * Polling: no hay websockets en hosting compartido con PHP, así que se
   * pregunta cada 4s **sólo por lo nuevo** (`desdeMensajeId`), que hace la
   * consulta barata. Se corta al salir de la pantalla.
   */
  useEffect(() => {
    if (loading || convId <= 0) return;
    const id = setInterval(() => {
      chatApi.abrir({ conversacionId: convId, desdeMensajeId: ultimoIdRef.current }).then((res) => {
        if (res.success && res.data && res.data.mensajes.length > 0) {
          aplicarMensajes(res.data.mensajes, false);
          void chatApi.marcarLeida(convId);
        }
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [convId, loading, aplicarMensajes]);

  const enviar = async (
    tipo: 'texto' | 'zumbido' | 'sticker' = 'texto',
    stickerId?: StickerId
  ) => {
    const limpio = convertirEmoticones(texto.trim());
    if (tipo === 'texto' && !limpio) return;
    if (tipo === 'sticker' && !stickerId) return;
    if (enviando) return;
    // Sin conversación todavía: hace falta saber a quién se le escribe.
    if (convId <= 0 && !userIdParam) return;

    setEnviando(true);
    setErrorEnvio(null);
    if (tipo === 'zumbido') {
      dispararZumbido();
    } else {
      hapticLeve();
    }
    // En un sticker lo que viaja en `texto` es el id del dibujo.
    const cuerpo = tipo === 'zumbido' ? '' : tipo === 'sticker' ? stickerId! : limpio;
    const res = await chatApi.enviar(convId > 0 ? convId : 0, cuerpo, tipo, convId > 0 ? undefined : (userIdParam ?? undefined));
    setEnviando(false);

    if (res.success && res.data) {
      // El primer mensaje crea la conversación: de acá en adelante hay id real
      // (y arranca el polling).
      if (convId <= 0 && res.data.conversacionId > 0) setConvId(res.data.conversacionId);
      setTexto('');
      setMensajes((prev) => [
        ...prev,
        {
          mensajeId: res.data!.mensajeId,
          userIdEmisor: user?.userId ?? 0,
          texto: tipo === 'zumbido' ? '¡Zumbido!' : tipo === 'sticker' ? stickerId! : limpio,
          tipo,
          createdAt: new Date().toISOString(),
        },
      ]);
      ultimoIdRef.current = res.data.mensajeId;
      zumbidoVistoRef.current = res.data.mensajeId;
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 60);
    } else {
      setErrorEnvio(res.message ?? t('chat.errorEnviar'));
    }
  };

  const irAlPerfil = () => {
    if (!otro?.username) return;
    hapticLeve();
    router.push(`/(app)/usuario/${otro.username}` as never);
  };

  const resolver = async (accion: 'aceptar' | 'rechazar') => {
    const res = await chatApi.resolverSolicitud(convId, accion);
    if (!res.success) return;
    if (accion === 'aceptar') {
      hapticExito();
      setEstado('activa');
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <Atmosphere style={styles.centrado}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <Animated.View style={[{ flex: 1 }, estiloSacudida]}>
        {otro ? (
          <Pressable
            onPress={irAlPerfil}
            disabled={!otro.username}
            style={[styles.cabecera, { borderBottomColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={otro.nombreCompleto}
          >
            <View style={styles.cabeceraFila}>
              {otro.avatarPath ? (
                <Image
                  source={{ uri: rhAvatarUrl(otro.avatarPath, otro.avatarBust ?? undefined) }}
                  style={styles.cabeceraAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.cabeceraAvatar, styles.cabeceraAvatarVacio, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
              )}
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                  {otro.nombreCompleto}
                </Text>
                {otro.mensajePersonal ? (
                  <Text style={[type.caption, { color: colors.accent }]} numberOfLines={1}>
                    {otro.mensajePersonal}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        ) : null}

        <FlatList
          ref={listaRef}
          data={mensajes}
          keyExtractor={(m) => String(m.mensajeId)}
          contentContainerStyle={styles.lista}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mio = item.userIdEmisor === user?.userId;
            if (item.tipo === 'zumbido') {
              return (
                <View style={styles.zumbidoFila}>
                  <Text style={[type.caption, { color: colors.accent }]}>
                    ⚡ {mio ? t('chat.zumbidoEnviado') : `${otro?.nombreCompleto ?? ''} — ${t('chat.zumbido')}`}
                  </Text>
                </View>
              );
            }
            if (item.tipo === 'historia' || item.tipo === 'historia_reaccion') {
              // Respuesta o reacción a una historia: la miniatura de la historia
              // arriba y, abajo, lo que se dijo — así se sabe a qué se responde
              // y se puede seguir la charla desde acá.
              const esReaccion = item.tipo === 'historia_reaccion';
              const titulo = esReaccion
                ? mio
                  ? t('chat.historiaReaccionaste')
                  : t('chat.historiaReacciono')
                : mio
                  ? t('chat.historiaRespondiste')
                  : t('chat.historiaRespondio');
              const fondo = mio ? colors.primary : colors.surface;
              const textoColor = mio ? colors.primaryText : colors.text;
              return (
                <View
                  style={[
                    styles.historiaBurbuja,
                    mio ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                  ]}
                >
                  <View style={styles.historiaEncabezado}>
                    <Ionicons name="albums-outline" size={12} color={colors.textMuted} />
                    <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                      {titulo}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      // Como Instagram: tocar la miniatura abre esa historia. La
                      // autora es quien la publicó: el otro si la respuesta es
                      // mía, yo si me respondieron a mí.
                      const autorId = mio ? otro?.userId : user?.userId;
                      if (!autorId) return;
                      router.push({
                        pathname: '/(app)/historias/ver/[userId]',
                        params: { userId: String(autorId), historiaId: String(item.historia?.historiaId ?? 0) },
                      } as never);
                    }}
                  >
                    {item.historia?.mediaPath ? (
                      <Image
                        source={{ uri: rhMediaUrl(item.historia.mediaPath) }}
                        style={styles.historiaMiniatura}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.historiaMiniatura, styles.historiaSinImagen]}>
                        <Ionicons name="videocam-outline" size={26} color={colors.textMuted} />
                      </View>
                    )}
                  </Pressable>
                  {esReaccion ? (
                    <Text style={styles.historiaEmoji}>{EMOJI_REACCION[item.texto] ?? '🐾'}</Text>
                  ) : (
                    <View style={[styles.historiaTexto, { backgroundColor: fondo }]}>
                      <Text style={{ color: textoColor, fontSize: 15 }}>{item.texto}</Text>
                    </View>
                  )}
                </View>
              );
            }
            if (item.tipo === 'sticker') {
              // Sin burbuja: el dibujo es el mensaje, encajonarlo lo achica.
              return (
                <View style={[styles.stickerFila, mio ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                  <StickerImagen id={item.texto} size={104} />
                </View>
              );
            }
            return (
              <View
                style={[
                  styles.burbuja,
                  mio
                    ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                    : { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: mio ? colors.primaryText : colors.text, fontSize: 15 }}>
                  {item.texto}
                </Text>
              </View>
            );
          }}
        />

        {estado === 'solicitud' ? (
          <View
            style={[
              styles.solicitud,
              { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 14 + aireBajo },
            ]}
          >
            <Text style={[type.bodySm, { color: colors.textMuted, textAlign: 'center' }]}>
              {otro?.nombreCompleto} {t('chat.solicitudDe')}
            </Text>
            <View style={styles.solicitudBotones}>
              <Pressable onPress={() => resolver('aceptar')} style={[styles.btn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.btnTexto, { color: colors.primaryText }]}>{t('chat.aceptar')}</Text>
              </Pressable>
              <Pressable
                onPress={() => resolver('rechazar')}
                style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.btnTexto, { color: colors.textMuted }]}>{t('chat.rechazar')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ backgroundColor: colors.surface, paddingBottom: aireBajo }}
          >
            {errorEnvio ? (
              <Text style={[type.caption, { color: colors.danger, textAlign: 'center', paddingTop: 6 }]}>{errorEnvio}</Text>
            ) : null}
            <View style={[styles.barra, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Pressable onPress={() => enviar('zumbido')} style={styles.zumbidoBtn} hitSlop={6}>
                <Ionicons name="flash" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => setPickerAbierto((v) => !v)}
                style={styles.zumbidoBtn}
                hitSlop={6}
                accessibilityLabel={t('chat.stickersTab')}
              >
                <Ionicons
                  name={pickerAbierto ? 'close-circle-outline' : 'happy-outline'}
                  size={22}
                  color={pickerAbierto ? colors.primary : colors.textMuted}
                />
              </Pressable>
              <TextInput
                value={texto}
                // Los emoticones se convierten mientras escribís, como el MSN.
                onChangeText={(v) => setTexto(convertirEmoticones(v))}
                placeholder={t('chat.escribiMensaje')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                multiline
                onSubmitEditing={() => enviar()}
              />
              <Pressable
                onPress={() => enviar()}
                disabled={!texto.trim() || enviando}
                style={[styles.enviar, { backgroundColor: colors.primary }, (!texto.trim() || enviando) && { opacity: 0.4 }]}
              >
                <Ionicons name="send" size={18} color={colors.primaryText} />
              </Pressable>
            </View>
            {pickerAbierto ? (
              <StickerPicker
                onSticker={(id) => {
                  setPickerAbierto(false);
                  void enviar('sticker', id);
                }}
                // El emoji se inserta en el texto en vez de mandarse solo: así
                // se puede escribir "vamos 🐾" en un mismo mensaje.
                onEmoji={(e) => setTexto((prev) => prev + e)}
                onCerrar={() => setPickerAbierto(false)}
              />
            ) : null}
          </KeyboardAvoidingView>
        )}
      </Animated.View>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  centrado: { alignItems: 'center', justifyContent: 'center' },
  cabecera: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: '100%' },
  cabeceraAvatar: { width: 38, height: 38, borderRadius: 19 },
  cabeceraAvatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 16 },
  lista: { padding: 12, gap: 8, paddingBottom: 20 },
  stickerFila: { marginVertical: 4, paddingHorizontal: 4 },
  burbuja: { maxWidth: '78%', borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10 },
  zumbidoFila: { alignSelf: 'center', paddingVertical: 6 },
  historiaBurbuja: { maxWidth: '72%', gap: 4 },
  historiaTexto: { alignSelf: 'stretch', borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 8 },
  historiaEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historiaMiniatura: { width: 150, height: 200, borderRadius: radii.lg },
  historiaSinImagen: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.18)' },
  historiaEmoji: { fontSize: 34, textAlign: 'center' },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  zumbidoBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 110,
  },
  enviar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  solicitud: { padding: 14, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  solicitudBotones: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: radii.md, paddingVertical: 10, alignItems: 'center' },
  btnTexto: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
