import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usuariosApi } from '../../src/api/usuariosApi';
import { HuePlusBadge } from '../../src/components/HuePlusBadge';
import { LogoSiluetaNegra } from '../../src/components/LogoImage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { HUBS } from '../../src/navigation/hubs';
import { BusquedaResultado, Mascota, UsuarioResumen } from '../../src/types';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../src/utils/media';

type Funcionalidad = {
  key: string;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  hubLabel: string;
};

type Fila =
  | { tipo: 'funcionalidad'; item: Funcionalidad }
  | { tipo: 'usuario'; item: UsuarioResumen }
  | { tipo: 'mascota'; item: Mascota };

export default function BuscarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [q, setQ] = useState('');
  const [resultado, setResultado] = useState<BusquedaResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const catalogo = useMemo(() => {
    const items: Funcionalidad[] = [];
    for (const hub of HUBS) {
      items.push({
        key: `hub-${hub.key}`,
        label: t(hub.labelKey),
        route: hub.route,
        icon: hub.icon,
        hubLabel: t(hub.labelKey),
      });
      for (const it of hub.items) {
        items.push({
          key: `${hub.key}-${it.key}`,
          label: t(it.labelKey),
          route: it.route,
          icon: it.icon,
          hubLabel: t(hub.labelKey),
        });
      }
    }
    return items;
  }, [t]);

  const funcionalidades = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return catalogo.filter(
      (f) =>
        f.label.toLowerCase().includes(needle) ||
        f.hubLabel.toLowerCase().includes(needle) ||
        f.key.toLowerCase().includes(needle)
    );
  }, [catalogo, q]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultado(null);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await usuariosApi.buscar(q.trim());
      if (res.success && res.data) {
        setResultado(res.data);
      }
      setLoading(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const filas: Fila[] = [
    ...funcionalidades.map((item): Fila => ({ tipo: 'funcionalidad', item })),
    ...(resultado?.usuarios ?? []).map((item): Fila => ({ tipo: 'usuario', item })),
    ...(resultado?.mascotas ?? []).map((item): Fila => ({ tipo: 'mascota', item })),
  ];

  const vacio = !loading && q.trim().length >= 2 && filas.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder={t('busqueda.placeholder')}
        placeholderTextColor={colors.textMuted}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}

      {vacio ? <EmptyState icon="search-outline" titulo={t('busqueda.emptyResults')} /> : null}
      {q.trim().length < 2 ? (
        <EmptyState icon="search-outline" titulo={t('busqueda.minChars')} fillScreen={false} />
      ) : null}

      <FlatList
        data={filas}
        keyExtractor={(fila, i) => {
          if (fila.tipo === 'funcionalidad') return `f-${fila.item.key}-${i}`;
          if (fila.tipo === 'usuario') return `u-${fila.item.userId}-${i}`;
          return `m-${fila.item.mascotaId}-${i}`;
        }}
        style={{ marginTop: 8 }}
        renderItem={({ item: fila, index }) => {
          const prev = index > 0 ? filas[index - 1] : null;
          const mostrarSeccion =
            index === 0 || (prev !== null && prev.tipo !== fila.tipo);

          return (
            <View>
              {mostrarSeccion ? (
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {fila.tipo === 'funcionalidad'
                    ? t('busqueda.sectionFeatures')
                    : fila.tipo === 'usuario'
                      ? t('busqueda.sectionUsers')
                      : t('busqueda.sectionPets')}
                </Text>
              ) : null}

              {fila.tipo === 'funcionalidad' ? (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => router.push(fila.item.route as never)}
                >
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                    <Ionicons name={fila.item.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{fila.item.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{fila.item.hubLabel}</Text>
                  </View>
                </Pressable>
              ) : null}

              {fila.tipo === 'usuario' ? (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => router.push(`/(app)/usuario/${fila.item.username}`)}
                >
                  {fila.item.avatarPath ? (
                    <Image source={{ uri: rhMediaUrl(fila.item.avatarPath) }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                      <LogoSiluetaNegra style={{ width: 20, height: 20 }} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>{fila.item.nombreCompleto}</Text>
                      <HuePlusBadge planCodigo={fila.item.planCodigo} size={12} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>@{fila.item.username}</Text>
                  </View>
                </Pressable>
              ) : null}

              {fila.tipo === 'mascota' ? (
                <Pressable
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => router.push(`/(app)/mascota/${fila.item.mascotaId}`)}
                >
                  {fila.item.fotos && fila.item.fotos[0] ? (
                    <Image source={{ uri: rhMediaUrl(fila.item.fotos[0].path) }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface }]} />
                  )}
                  <View>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{fila.item.nombre}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{fila.item.raza}</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, ...centeredContent },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
