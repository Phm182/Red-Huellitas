import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
import { matchApi } from '../../../src/api/matchApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { MascotaMatch, MatchMensaje } from '../../../src/types';
import { useTheme } from '../../../src/theme/ThemeProvider';

const POLL_INTERVAL_MS = 5000;

export default function MatchChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const matchIdNum = Number(matchId);

  const [match, setMatch] = useState<MascotaMatch | null>(null);
  const [mensajes, setMensajes] = useState<MatchMensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState<string | null>(null);

  const cargarMensajes = useCallback(() => {
    matchApi.mensajes(matchIdNum).then((res) => {
      if (res.success && res.data) {
        setMensajes(res.data.mensajes);
      }
    });
  }, [matchIdNum]);

  const cargarMatch = useCallback(() => {
    matchApi.misMatches().then((res) => {
      if (res.success && res.data) {
        setMatch(res.data.matches.find((m) => m.matchId === matchIdNum) ?? null);
      }
    });
  }, [matchIdNum]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      Promise.all([matchApi.mensajes(matchIdNum), matchApi.misMatches()]).then(([resMsg, resMatches]) => {
        if (!activo) return;
        if (resMsg.success && resMsg.data) setMensajes(resMsg.data.mensajes);
        if (resMatches.success && resMatches.data) {
          const encontrado = resMatches.data.matches.find((m) => m.matchId === matchIdNum) ?? null;
          setMatch(encontrado);
          if (encontrado?.whatsappRevelado) {
            matchApi.revelarWhatsapp(matchIdNum).then((res) => {
              if (activo && res.success && res.data?.revelado) {
                setWhatsappNumero(res.data.whatsappNumero ?? null);
              }
            });
          }
        }
        setLoading(false);
      });

      const interval = setInterval(cargarMensajes, POLL_INTERVAL_MS);
      return () => {
        activo = false;
        clearInterval(interval);
      };
    }, [matchIdNum, cargarMensajes])
  );

  const onEnviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const res = await matchApi.enviarMensaje(matchIdNum, texto.trim());
    setEnviando(false);
    if (res.success) {
      setTexto('');
      cargarMensajes();
    }
  };

  const onRevelarWhatsapp = async () => {
    setRevelando(true);
    const res = await matchApi.revelarWhatsapp(matchIdNum);
    setRevelando(false);
    if (res.success && res.data) {
      if (res.data.revelado) {
        setWhatsappNumero(res.data.whatsappNumero ?? null);
      }
      cargarMatch();
    }
  };

  const onDeshacer = () => {
    Alert.alert(t('match.deshacerConfirmTitle'), t('match.deshacerConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('match.deshacerButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await matchApi.deshacer(matchIdNum);
          if (res.success) {
            router.replace('/(app)/match/matches');
          }
        },
      },
    ]);
  };

  if (loading || !match) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const otroUserId = match.mascota?.userId ?? null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{match.mascota?.nombre ?? '—'}</Text>
        <View style={styles.headerActions}>
          {otroUserId !== null ? <DenunciaButtonStub userId={otroUserId} /> : null}
          <Pressable onPress={onDeshacer}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>{t('match.deshacerButton')}</Text>
          </Pressable>
        </View>
      </View>

      {match.whatsappRevelado ? (
        <Pressable
          style={[styles.whatsappButton, { backgroundColor: colors.primary }]}
          onPress={() => whatsappNumero && Linking.openURL(`https://wa.me/${whatsappNumero.replace(/\D/g, '')}`)}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
        </Pressable>
      ) : match.miConsentimiento ? (
        <View style={[styles.whatsappButton, { borderWidth: 1, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted }}>{t('match.esperandoConfirmacionOtro')}</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.whatsappButton, { borderWidth: 1, borderColor: colors.primary }]}
          onPress={onRevelarWhatsapp}
          disabled={revelando}
        >
          {revelando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('match.revelarWhatsappButton')}</Text>
          )}
        </Pressable>
      )}

      <FlatList
        data={[...mensajes].reverse()}
        keyExtractor={(item) => String(item.mensajeId)}
        contentContainerStyle={styles.mensajes}
        renderItem={({ item }) => (
          <View
            style={[
              styles.burbuja,
              item.esMio
                ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                : { backgroundColor: colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: item.esMio ? colors.primaryText : colors.text }}>{item.texto}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>{t('match.sinMensajesAun')}</Text>
        }
      />

      <View style={[styles.inputRow, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={texto}
          onChangeText={setTexto}
          placeholder={t('match.mensajePlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable onPress={onEnviar} disabled={!texto.trim() || enviando} style={styles.sendButton}>
          {enviando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.send')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  whatsappButton: { margin: 12, borderRadius: 10, padding: 12, alignItems: 'center' },
  mensajes: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  burbuja: { maxWidth: '75%', borderRadius: 14, padding: 10, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, maxHeight: 100, fontSize: 15 },
  sendButton: { padding: 8 },
});
