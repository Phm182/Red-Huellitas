import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adopcionApi } from '../../../../src/api/adopcionApi';
import { AppInput } from '../../../../src/components/AppInput';
import { MultiImagePickerField } from '../../../../src/components/MultiImagePickerField';
import { RazaPicker } from '../../../../src/components/RazaPicker';
import { SkeletonList } from '../../../../src/components/ui/Skeleton';
import { Especie, Sexo } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../../src/utils/media';

/**
 * Editar publicación propia de adopción (bloqueada si está en proceso).
 */
export default function EditarAdopcionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const adopcionId = Number(id);

  const [loading, setLoading] = useState(true);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [edadAnios, setEdadAnios] = useState('');
  const [edadMeses, setEdadMeses] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoIds, setFotoIds] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      adopcionApi.obtener(adopcionId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const a = res.data.adopcion;
          if (a.editable === false) {
            setBloqueado(a.motivoNoEditable || t('adopcion.noEditable'));
          } else {
            setBloqueado(null);
          }
          setNombre(a.nombre);
          setSexo(a.sexo);
          setEspecie(a.especie);
          setRazaId(a.razaId);
          setRazaTexto(a.razaTexto);
          setEdadAnios(a.edadAnios != null ? String(a.edadAnios) : '');
          setEdadMeses(a.edadMeses != null ? String(a.edadMeses) : '');
          setDescripcion(a.descripcion ?? '');
          const uris = a.fotos.map((f) => rhMediaUrl(f.path));
          setFotos(uris);
          setFotoIds(a.fotos.map((f) => f.adopcionFotoId));
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [adopcionId, t])
  );

  const onFotosChange = (uris: string[]) => {
    // Conservar ids de las URIs que siguen siendo remotas conocidas
    const nextIds = uris.map((uri) => {
      const idx = fotos.indexOf(uri);
      if (idx >= 0) return fotoIds[idx] ?? null;
      return null;
    });
    setFotos(uris);
    setFotoIds(nextIds);
  };

  const onGuardar = async () => {
    if (bloqueado || !nombre.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await adopcionApi.actualizar(adopcionId, {
      nombre: nombre.trim(),
      sexo,
      especie,
      razaId,
      razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
      edadAnios: edadAnios ? parseInt(edadAnios, 10) : null,
      edadMeses: edadMeses ? parseInt(edadMeses, 10) : null,
      descripcion: descripcion.trim() || undefined,
      fotos,
      fotosExistentesIds: fotoIds.map((id) => id ?? 0),
      preguntas: [],
    });
    setSubmitting(false);
    if (res.success) {
      router.back();
    } else {
      setError(res.message);
    }
  };

  if (loading) return <SkeletonList />;

  if (bloqueado) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, textAlign: 'center' }}>
          {t('adopcion.noEditableTitulo')}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, textAlign: 'center' }}>{bloqueado}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.close')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.wrap, centeredContent, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.nombre')}</Text>
      <AppInput value={nombre} onChangeText={setNombre} />

      <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.sexo')}</Text>
      <View style={styles.row}>
        {(['macho', 'hembra'] as Sexo[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSexo(s)}
            style={[
              styles.chip,
              { borderColor: colors.primary, backgroundColor: sexo === s ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: sexo === s ? colors.primaryText : colors.primary }}>
              {t(`mascotas.sexo${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.especie')}</Text>
      <View style={styles.row}>
        {(['perro', 'gato', 'otro'] as Especie[]).map((e) => (
          <Pressable
            key={e}
            onPress={() => {
              setEspecie(e);
              setRazaId(null);
              setRazaTexto(null);
            }}
            style={[
              styles.chip,
              { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary }}>
              {t(`mascotas.especie${e.charAt(0).toUpperCase()}${e.slice(1)}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <RazaPicker
        especie={especie}
        razaId={razaId}
        razaTexto={razaTexto}
        onChange={(id, texto) => {
          setRazaId(id);
          setRazaTexto(texto);
        }}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.edadAnios')}</Text>
          <AppInput value={edadAnios} onChangeText={setEdadAnios} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.edadMeses')}</Text>
          <AppInput value={edadMeses} onChangeText={setEdadMeses} keyboardType="number-pad" />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>{t('mascotas.descripcion')}</Text>
      <AppInput value={descripcion} onChangeText={setDescripcion} multiline style={{ minHeight: 80 }} />

      <MultiImagePickerField
        label={t('adopcion.fotos')}
        uris={fotos}
        onChange={onFotosChange}
        addLabel={t('perfil.addPhoto')}
      />

      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}

      <Pressable
        onPress={onGuardar}
        disabled={submitting}
        style={[styles.btn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '700' }}>{t('common.save')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  btn: { marginTop: 20, borderRadius: 10, padding: 14, alignItems: 'center' },
});
