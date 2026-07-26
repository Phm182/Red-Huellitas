import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usuariosApi } from '../../src/api/usuariosApi';
import { LogoSiluetaNegra } from '../../src/components/LogoImage';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BusquedaResultado, Mascota, UsuarioResumen } from '../../src/types';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../src/utils/media';

type Fila = { tipo: 'usuario'; item: UsuarioResumen } | { tipo: 'mascota'; item: Mascota };

export default function BuscarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [q, setQ] = useState('');
  const [resultado, setResultado] = useState<BusquedaResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    ...(resultado?.usuarios ?? []).map((item): Fila => ({ tipo: 'usuario', item })),
    ...(resultado?.mascotas ?? []).map((item): Fila => ({ tipo: 'mascota', item })),
  ];

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

      {!loading && q.trim().length >= 2 && filas.length === 0 ? (
        <EmptyState icon="search-outline" titulo={t('busqueda.emptyResults')} />
      ) : null}
      {q.trim().length < 2 ? (
        <EmptyState icon="search-outline" titulo={t('busqueda.minChars')} fillScreen={false} />
      ) : null}

      <FlatList
        data={filas}
        keyExtractor={(fila, i) => `${fila.tipo}-${fila.tipo === 'usuario' ? fila.item.userId : fila.item.mascotaId}-${i}`}
        style={{ marginTop: 8 }}
        renderItem={({ item: fila, index }) => {
          return (
            <View>
              {index === 0 && resultado && resultado.usuarios.length > 0 && fila.tipo === 'usuario' ? (
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('busqueda.sectionUsers')}</Text>
              ) : null}
              {fila.tipo === 'mascota' &&
              (index === 0 || filas[index - 1].tipo === 'usuario') ? (
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('busqueda.sectionPets')}</Text>
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
                  <View>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{fila.item.nombreCompleto}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>@{fila.item.username}</Text>
                  </View>
                </Pressable>
              ) : (
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
              )}
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
