import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { equiposApi } from '../../../src/api/equiposApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { InsigniaEquipo } from '../../../src/components/InsigniaEquipo';
import { ReputacionLinea } from '../../../src/components/Estrellas';
import { ChipRow } from '../../../src/components/ui/ChipRow';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Fab } from '../../../src/components/ui/Fab';
import { ListSearchBar } from '../../../src/components/ui/ListSearchBar';
import { Equipo, TipoEquipo } from '../../../src/types/equipo';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { filtrarPorTexto } from '../../../src/utils/filtrarPorTexto';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhMediaUrl } from '../../../src/utils/media';

/**
 * Directorio de equipos: refugios, protectoras, veterinarias, ONGs y
 * organismos públicos.
 *
 * Antes de crear uno conviene buscar el propio acá: dos equipos con el mismo
 * nombre son casi siempre la misma organización cargada dos veces, y el alta
 * lo rechaza justamente por eso.
 */
export default function EquiposScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tipos, setTipos] = useState<TipoEquipo[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);

      Promise.all([equiposApi.listar(), equiposApi.mis()]).then(([lista, mis]) => {
        if (!activo) return;
        if (lista.success && lista.data) setEquipos(lista.data.equipos);
        if (mis.success && mis.data) setTipos(mis.data.tipos);
        setLoading(false);
      });

      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <Atmosphere style={styles.centrado}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Atmosphere>
    );
  }

  const porTipo = tipoFiltro ? equipos.filter((e) => e.tipo.codigo === tipoFiltro) : equipos;
  const filtrados = filtrarPorTexto(porTipo, busqueda, (e) => [
    e.nombre,
    e.zonaDescripcion,
    e.tipo.nombre,
  ]);
  const buscando = busqueda.trim().length > 0;

  return (
    <Atmosphere>
      <ListSearchBar value={busqueda} onChangeText={setBusqueda} />

      <ChipRow
        opciones={[
          { valor: '', label: t('common.seeAll') },
          ...tipos.map((tp) => ({ valor: tp.codigo, label: tp.nombre })),
        ]}
        seleccionado={tipoFiltro ?? ''}
        onSelect={(v) => setTipoFiltro(v === '' ? null : v)}
      />

      <FlatList
        data={filtrados}
        keyExtractor={(e) => String(e.equipoId)}
        contentContainerStyle={[
          styles.lista,
          centeredContent,
          filtrados.length === 0 && styles.vacia,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            titulo={buscando ? t('common.sinResultadosBusqueda') : t('equipos.emptyLista')}
            descripcion={buscando ? undefined : t('equipos.emptyDesc')}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              hapticLeve();
              router.push({ pathname: '/(app)/equipos/[id]', params: { id: item.equipoId } });
            }}
            style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {item.avatarPath ? (
              <Image
                source={{ uri: rhMediaUrl(item.avatarPath) }}
                style={styles.avatar}
                contentFit="cover"
                transition={160}
              />
            ) : (
              <View
                style={[styles.avatar, styles.avatarVacio, { backgroundColor: item.tipo.color + '22' }]}
              >
                <Ionicons name={item.tipo.icono as never} size={20} color={item.tipo.color} />
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                {item.nombre}
              </Text>
              <InsigniaEquipo tipo={item.tipo} verificado={item.verificado} size="sm" />
              <View style={styles.metaFila}>
                <ReputacionLinea
                  reputacion={item.reputacion}
                  sinDatosLabel={t('equipos.sinCalificaciones')}
                />
                <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                  · {t('equipos.miembrosCount', { count: item.totalMiembros })}
                  {item.zonaDescripcion ? ` · ${item.zonaDescripcion}` : ''}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      />

      <Fab
        icon="add"
        onPress={() => {
          hapticLeve();
          router.push('/(app)/equipos/nuevo');
        }}
        accessibilityLabel={t('equipos.crear')}
      />
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  centrado: { alignItems: 'center', justifyContent: 'center' },
  lista: { padding: 14, gap: 8, paddingBottom: 90, flexGrow: 1 },
  vacia: { justifyContent: 'center' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: fonts.bodySemi, fontSize: 15 },
  metaFila: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
});
