import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { Adopcion, Especie } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Fab } from '../../../src/components/ui/Fab';

const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];

export default function AdopcionListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [especie, setEspecie] = useState<Especie | null>(null);
  const [listados, setListados] = useState<Adopcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const cargar = useCallback((filtro: Especie | null) => {
    setLoading(true);
    adopcionApi.listar(filtro ?? undefined).then((res) => {
      if (res.success && res.data) {
        setListados(res.data.listados);
        setNextCursor(res.data.nextCursor);
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(especie);
    }, [especie, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null) return;
    setCargandoMas(true);
    const res = await adopcionApi.listar(especie ?? undefined, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable onPress={() => router.push('/(app)/adopcion/mis-postulaciones')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('adopcion.misPostulaciones')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/adopcion/favoritos')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('adopcion.misFavoritos')}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setEspecie(null)}
          style={[
            styles.chip,
            { borderColor: colors.primary, backgroundColor: especie === null ? colors.primary : 'transparent' },
          ]}
        >
          <Text style={{ color: especie === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('adopcion.todas')}
          </Text>
        </Pressable>
        {ESPECIES.map((e) => {
          const activo = especie === e;
          return (
            <Pressable
              key={e}
              onPress={() => setEspecie(e)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`)}
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
          data={listados}
          keyExtractor={(a) => String(a.adopcionId)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/adopcion/[id]', params: { id: item.adopcionId } })}
            >
              {item.fotos[0] ? (
                <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder, { backgroundColor: colors.background }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.nombre}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.raza ?? item.especie}</Text>
                {item.estadoAdopcion !== 'disponible' ? (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                    {t(`adopcion.estado.${item.estadoAdopcion}`)}
                  </Text>
                ) : null}
              </View>
              {item.esFavorito ? <Text style={{ fontSize: 18 }}>❤️</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('adopcion.emptyLista')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/adopcion/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  atajos: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
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
