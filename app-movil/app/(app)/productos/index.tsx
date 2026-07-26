import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { productosApi } from '../../../src/api/productosApi';
import { Especie, Producto, ProductoCategoriaItem, TipoListado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { Fab } from '../../../src/components/ui/Fab';

const TIPOS: TipoListado[] = ['producto', 'servicio'];
const ESPECIES: Especie[] = ['perro', 'gato', 'otro'];
const RADIOS: Array<20 | 50 | 100> = [20, 50, 100];

export default function ProductosListaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [categorias, setCategorias] = useState<ProductoCategoriaItem[]>([]);
  const [tipoListado, setTipoListado] = useState<TipoListado | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [radioKm, setRadioKm] = useState<20 | 50 | 100 | null>(null);

  const [listados, setListados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  useEffect(() => {
    productosApi.categorias().then((res) => {
      if (res.success && res.data) {
        setCategorias(res.data.categorias);
      }
    });
  }, []);

  const cargar = useCallback(
    (tl: TipoListado | null, cat: number | null, esp: Especie | null, radio: 20 | 50 | 100 | null) => {
      setLoading(true);
      productosApi.listar(tl ?? undefined, cat ?? undefined, esp ?? undefined, radio).then((res) => {
        if (res.success && res.data) {
          setListados(res.data.listados);
          setNextCursor(res.data.nextCursor);
        }
        setLoading(false);
      });
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      cargar(tipoListado, categoriaId, especie, radioKm);
    }, [tipoListado, categoriaId, especie, radioKm, cargar])
  );

  const cargarMas = async () => {
    if (cargandoMas || nextCursor === null || radioKm !== null) return;
    setCargandoMas(true);
    const res = await productosApi.listar(tipoListado ?? undefined, categoriaId ?? undefined, especie ?? undefined, null, nextCursor);
    if (res.success && res.data) {
      setListados((prev) => [...prev, ...res.data!.listados]);
      setNextCursor(res.data.nextCursor);
    }
    setCargandoMas(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.atajos}>
        <Pressable onPress={() => router.push('/(app)/productos/favoritos')}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('productos.misFavoritos')}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setTipoListado(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: tipoListado === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: tipoListado === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('productos.todos')}
          </Text>
        </Pressable>
        {TIPOS.map((tp) => {
          const activo = tipoListado === tp;
          return (
            <Pressable
              key={tp}
              onPress={() => setTipoListado(tp)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                {t(`productos.tipoListado.${tp}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setCategoriaId(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: categoriaId === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: categoriaId === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('productos.todas')}
          </Text>
        </Pressable>
        {categorias.map((c) => {
          const activo = categoriaId === c.categoriaId;
          return (
            <Pressable
              key={c.categoriaId}
              onPress={() => setCategoriaId(c.categoriaId)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' }]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>{c.nombre}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros}>
        <Pressable
          onPress={() => setEspecie(null)}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: especie === null ? colors.primary : 'transparent' }]}
        >
          <Text style={{ color: especie === null ? colors.primaryText : colors.primary, fontWeight: '600' }}>
            {t('productos.todas')}
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
            {t('productos.todas')}
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
          keyExtractor={(item) => String(item.productoId)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/productos/[id]', params: { id: item.productoId } })}
            >
              {item.fotos[0] ? (
                <Image source={{ uri: rhMediaUrl(item.fotos[0].path) }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder, { backgroundColor: colors.background }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={2}>
                  {item.nombre}
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 2 }}>
                  ${item.precio.toLocaleString()}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {item.categoria?.nombre ?? ''}
                  {item.distanciaKm !== null ? ` · ${item.distanciaKm}km` : ''}
                </Text>
              </View>
              {item.esFavorito ? <Text style={{ fontSize: 18 }}>❤️</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, marginTop: 24 }}>{t('productos.emptyLista')}</Text>}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}

      <Fab onPress={() => router.push('/(app)/productos/nueva')} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  atajos: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  filtros: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 6 },
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
