import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { mascotasApi } from '../api/mascotasApi';
import { Especie, RazaCatalogoItem } from '../types';
import { useTheme } from '../theme/ThemeProvider';

const OTRA_SENTINEL = '__otra__';

interface RazaPickerProps {
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  onChange: (razaId: number | null, razaTexto: string | null) => void;
}

export function RazaPicker({ especie, razaId, razaTexto, onChange }: RazaPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [razas, setRazas] = useState<RazaCatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modoTextoLibre, setModoTextoLibre] = useState(razaId === null && !!razaTexto);

  useEffect(() => {
    setLoading(true);
    mascotasApi.razas(especie).then((res) => {
      if (res.success && res.data) {
        setRazas(res.data.razas);
      }
      setLoading(false);
    });
  }, [especie]);

  const seleccionar = (id: number | typeof OTRA_SENTINEL) => {
    if (id === OTRA_SENTINEL) {
      setModoTextoLibre(true);
      onChange(null, razaTexto ?? '');
    } else {
      setModoTextoLibre(false);
      onChange(id, null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.raza')}</Text>

      {loading ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {razas.map((r) => {
            const activo = !modoTextoLibre && razaId === r.razaId;
            return (
              <Pressable
                key={r.razaId}
                onPress={() => seleccionar(r.razaId)}
                style={[
                  styles.chip,
                  { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.primary, fontSize: 13 }}>{r.nombre}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => seleccionar(OTRA_SENTINEL)}
            style={[
              styles.chip,
              { borderColor: colors.primary, backgroundColor: modoTextoLibre ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: modoTextoLibre ? colors.primaryText : colors.primary, fontSize: 13 }}>
              {t('mascotas.razaOtra')}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {modoTextoLibre ? (
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder={t('mascotas.razaOtraPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={razaTexto ?? ''}
          onChangeText={(texto) => onChange(null, texto)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  chips: { marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
});
