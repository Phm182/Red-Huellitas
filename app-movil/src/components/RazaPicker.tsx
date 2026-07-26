import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { mascotasApi } from '../api/mascotasApi';
import { Especie, RazaCatalogoItem } from '../types';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { AppInput } from './AppInput';
import { ChipRow, ChipOption } from './ui/ChipRow';
import { Skeleton } from './ui/Skeleton';

const OTRA_SENTINEL = -1;

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

  const seleccionar = (id: number) => {
    if (id === OTRA_SENTINEL) {
      setModoTextoLibre(true);
      onChange(null, razaTexto ?? '');
    } else {
      setModoTextoLibre(false);
      onChange(id, null);
    }
  };

  const opciones: ChipOption<number>[] = [
    ...razas.map((r) => ({ valor: r.razaId, label: r.nombre })),
    { valor: OTRA_SENTINEL, label: t('mascotas.razaOtra'), icon: 'create-outline' as const },
  ];

  return (
    <View style={styles.container}>
      <Text style={[type.label, { color: colors.textMuted, marginBottom: 8 }]}>{t('mascotas.raza')}</Text>

      {loading ? (
        <View style={styles.skeletons}>
          <Skeleton width={90} height={36} radius={999} />
          <Skeleton width={110} height={36} radius={999} />
          <Skeleton width={80} height={36} radius={999} />
        </View>
      ) : (
        <ChipRow
          opciones={opciones}
          seleccionado={modoTextoLibre ? OTRA_SENTINEL : (razaId ?? -999)}
          onSelect={seleccionar}
          style={{ paddingHorizontal: 0 }}
        />
      )}

      {modoTextoLibre ? (
        <AppInput
          placeholder={t('mascotas.razaOtraPlaceholder')}
          value={razaTexto ?? ''}
          onChangeText={(texto) => onChange(null, texto)}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  skeletons: { flexDirection: 'row', gap: 8 },
});
