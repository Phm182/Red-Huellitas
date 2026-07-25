import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { Campania, TipoCampania } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

const TIPOS: TipoCampania[] = ['castracion', 'vacunacion'];

export default function CampaniasListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoCampania | null>(null);
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: TipoCampania | null) => {
    setLoading(true);
    campaniaApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setCampanias(res.data.campanias);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(tipo);
    }, [tipo, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await campaniaApi.listar(tipo ?? undefined, nextCursor);
    if (res.success && res.data) {
      setCampanias((prev) => [...prev, ...res.data!.campanias]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable onPress={() => router.push('/(app)/campanias/mis-inscripciones')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('campanias.misInscripciones')}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setTipo(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: tipo === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: tipo === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('campanias.todas')}
          </Text>
        </Pressable>
        {TIPOS.map((tp) => {
          const activo = tipo === tp;
          return (
            <Pressable
              key={tp}
              onPress={() => setTipo(tp)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`campanias.tipo.${tp}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={campanias}
          keyExtractor={(c) => String(c.campaniaId)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/campanias/[id]', params: { id: item.campaniaId } })}
            >
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                {t(`campanias.tipo.${item.tipo}`).toUpperCase()}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.titulo}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.fechaDesde}{item.fechaHasta ? ` – ${item.fechaHasta}` : ''} · {item.zonaDescripcion}
              </Text>
              {item.requiereInscripcion ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {t('campanias.cupoDisponibleLabel', { cupo: item.cupoDisponible ?? '∞' })}
                </Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('campanias.emptyLista')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(app)/campanias/nueva')}
      >
        <Text style={{ color: colors.primaryText, fontSize: 24, fontWeight: '700' }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  atajos: { paddingHorizontal: 16, paddingTop: 12 },
  filtros: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  list: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  fab: {
    // left (no right) para no superponerse con el FloatingReportButton global.
    position: 'absolute',
    bottom: 24,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
