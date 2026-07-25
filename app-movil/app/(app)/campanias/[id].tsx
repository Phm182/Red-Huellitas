import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { Campania } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { compartirPost } from '../../../src/utils/compartir';

export default function CampaniaDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [campania, setCampania] = useState<Campania | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [inscribiError, setInscribiError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      campaniaApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setCampania(res.data.campania);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onCompartir = () => {
    if (!campania) return;
    compartirPost({
      texto: campania.titulo,
      url: Linking.createURL(`/campanias/${campania.campaniaId}`),
    });
  };

  const onInscribirme = async () => {
    if (!campania || inscribiendo) return;
    setInscribiError(null);
    setInscribiendo(true);
    const res = await campaniaApi.inscribirme(campania.campaniaId);
    setInscribiendo(false);
    if (res.success) {
      setCampania({
        ...campania,
        estoyInscripto: true,
        totalInscriptos: (campania.totalInscriptos ?? 0) + 1,
        cupoDisponible: campania.cupoDisponible !== null && campania.cupoDisponible !== undefined
          ? campania.cupoDisponible - 1
          : campania.cupoDisponible,
      });
    } else {
      setInscribiError(res.message);
    }
  };

  const onEliminar = () => {
    if (!campania) return;
    Alert.alert(t('campanias.deleteConfirmTitle'), t('campanias.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await campaniaApi.eliminar(campania.campaniaId);
          if (res.success) {
            router.replace('/(app)/campanias');
          }
        },
      },
    ]);
  };

  if (loading || !campania) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
        {t(`campanias.tipo.${campania.tipo}`).toUpperCase()}
      </Text>
      <Text style={[styles.titulo, { color: colors.text }]}>{campania.titulo}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>
        {campania.fechaDesde}{campania.fechaHasta ? ` – ${campania.fechaHasta}` : ''}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>{campania.zonaDescripcion}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{campania.autor.username}</Text>

      {campania.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{campania.descripcion}</Text> : null}

      <Pressable style={[styles.button, styles.buttonOutline, { borderColor: colors.primary }]} onPress={onCompartir}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>↗ {t('feed.share')}</Text>
      </Pressable>

      {campania.requiereInscripcion ? (
        campania.esDueno ? (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(app)/campanias/[id]/inscripciones', params: { id: campania.campaniaId } })}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
              {t('campanias.verInscriptos')} ({campania.totalInscriptos ?? 0})
            </Text>
          </Pressable>
        ) : campania.estoyInscripto ? (
          <View style={[styles.button, styles.buttonOutline, { borderColor: colors.success }]}>
            <Text style={{ color: colors.success, fontWeight: '600' }}>✓ {t('campanias.yaInscripto')}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: campania.cupoDisponible === 0 ? colors.border : colors.primary }]}
            onPress={onInscribirme}
            disabled={inscribiendo || campania.cupoDisponible === 0}
          >
            {inscribiendo ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
                {campania.cupoDisponible === 0 ? t('campanias.cupoLleno') : t('campanias.inscribirmeButton')}
              </Text>
            )}
          </Pressable>
        )
      ) : null}
      {inscribiError ? <Text style={{ color: colors.danger, marginTop: 8 }}>{inscribiError}</Text> : null}

      {campania.esDueno ? (
        <Pressable onPress={onEliminar} style={styles.eliminarLink}>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{t('campanias.eliminarButton')}</Text>
        </Pressable>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={campania.autor.userId} campaniaId={campania.campaniaId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 20 },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  buttonOutline: { borderWidth: 1 },
  eliminarLink: { marginTop: 8, alignItems: 'center' },
  denunciaRow: { marginTop: 8, alignItems: 'center' },
});
