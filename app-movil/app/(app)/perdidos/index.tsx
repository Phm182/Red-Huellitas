import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { perdidosApi } from '../../../src/api/perdidosApi';
import { Perdido, TipoPerdido } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Fab } from '../../../src/components/ui/Fab';

const TIPOS: TipoPerdido[] = ['perdido', 'encontrado'];

export default function PerdidosListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoPerdido | null>(null);
  const [reportes, setReportes] = useState<Perdido[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: TipoPerdido | null) => {
    setLoading(true);
    perdidosApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setReportes(res.data.reportes);
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
    const res = await perdidosApi.listar(tipo ?? undefined, nextCursor);
    if (res.success && res.data) {
      setReportes((prev) => [...prev, ...res.data!.reportes]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setTipo(null)}
          style={[
            styles.chip,
            { borderColor: colors.primary, backgroundColor: tipo === null ? colors.primary : 'transparent' },
          ]}
        >
          <Text style={{ color: tipo === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('perdidos.todas')}
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
                {t(`perdidos.tipo.${tp}`)}
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
          data={reportes}
          keyExtractor={(p) => String(p.perdidoId)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/perdidos/[id]', params: { id: item.perdidoId } })}
            >
              {item.fotos[0] ? (
                <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder, { backgroundColor: colors.background }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.nombre}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.raza ?? item.especie}</Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                  {t(`perdidos.tipo.${item.tipo}`)}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('perdidos.emptyLista')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/perdidos/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filtros: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  foto: { width: 64, height: 64, borderRadius: 10 },
  fotoPlaceholder: {},
});
