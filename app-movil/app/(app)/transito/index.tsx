import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { transitoApi } from '../../../src/api/transitoApi';
import { TipoTransito, Transito } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Fab } from '../../../src/components/ui/Fab';

const TIPOS: TipoTransito[] = ['necesito', 'ofrezco'];
const RADIOS: Array<20 | 50 | 100> = [20, 50, 100];

export default function TransitoListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [tipo, setTipo] = useState<TipoTransito | null>(null);
  const [radioKm, setRadioKm] = useState<20 | 50 | 100 | null>(20);
  const [listados, setListados] = useState<Transito[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtroTipo: TipoTransito | null, filtroRadio: 20 | 50 | 100 | null) => {
    setLoading(true);
    transitoApi.listar(filtroTipo ?? undefined, filtroRadio).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(tipo, radioKm);
    }, [tipo, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await transitoApi.listar(tipo ?? undefined, null, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setTipo(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: tipo === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: tipo === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('transito.todas')}
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
                {t(`transito.tipo.${tp}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        {RADIOS.map((r) => {
          const activo = radioKm === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRadioKm(r)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>{r}km</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setRadioKm(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: radioKm === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: radioKm === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('transito.todas')}
          </Text>
        </Pressable>
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, centeredContent]}
          data={listados}
          keyExtractor={(item) => String(item.transitoId)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/transito/[id]', params: { id: item.transitoId } })}
            >
              {item.fotos[0] ? (
                <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder, { backgroundColor: colors.background }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                  {item.nombre ?? t(`transito.tipo.${item.tipo}`)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {item.raza ?? item.especie ?? item.zonaDescripcion}
                </Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                  {t(`transito.tipo.${item.tipo}`)}
                  {item.distanciaKm !== null ? ` · ${item.distanciaKm}km` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('transito.emptyLista')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/transito/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filtros: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 8 },
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
