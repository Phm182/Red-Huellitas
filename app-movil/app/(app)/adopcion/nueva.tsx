import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { adopcionApi } from '../../../src/api/adopcionApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { PreguntaBuilder } from '../../../src/components/PreguntaBuilder';
import { RazaPicker } from '../../../src/components/RazaPicker';
import { Especie, PreguntaBorrador, Sexo, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function NuevaAdopcionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [edadAnios, setEdadAnios] = useState('');
  const [edadMeses, setEdadMeses] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [preguntas, setPreguntas] = useState<PreguntaBorrador[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingGate(true);
      perfilApi.estadoVerificacion().then((res) => {
        if (activo && res.success && res.data) {
          setVerificacion(res.data);
        }
        if (activo) setLoadingGate(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const cambiarEspecie = (nueva: Especie) => {
    setEspecie(nueva);
    setRazaId(null);
    setRazaTexto(null);
  };

  const preguntasValidas = preguntas.every(
    (p) => p.texto.trim().length > 0 && (p.tipo !== 'opcion_multiple' || p.opciones.filter((o) => o.trim()).length >= 2)
  );

  const puedePublicar =
    nombre.trim().length > 0 && (razaId !== null || !!razaTexto?.trim()) && preguntasValidas;

  const onPublicar = async () => {
    if (!puedePublicar) return;
    setError(null);
    setSubmitting(true);
    const res = await adopcionApi.crear({
      nombre: nombre.trim(),
      sexo,
      especie,
      razaId,
      razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
      edadAnios: edadAnios ? parseInt(edadAnios, 10) : null,
      edadMeses: edadMeses ? parseInt(edadMeses, 10) : null,
      descripcion: descripcion.trim() || undefined,
      fotos,
      preguntas: preguntas.map((p) => ({ ...p, opciones: p.opciones.filter((o) => o.trim()) })),
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.replace({ pathname: '/(app)/adopcion/[id]', params: { id: res.data.adopcion.adopcionId } });
    } else {
      setError(res.message);
    }
  };

  if (loadingGate) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('feed.verificationRequiredTitle')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('feed.verificationRequiredBody')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.goToVerification')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.nombre')}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={nombre}
        onChangeText={setNombre}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.sexo')}</Text>
      <View style={styles.segmented}>
        {(['macho', 'hembra'] as Sexo[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSexo(s)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: sexo === s ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: sexo === s ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(s === 'macho' ? 'mascotas.sexoMacho' : 'mascotas.sexoHembra')}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.edadAnios')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={edadAnios}
            onChangeText={setEdadAnios}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.edadMeses')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={edadMeses}
            onChangeText={setEdadMeses}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.especie')}</Text>
      <View style={styles.segmented}>
        {(['perro', 'gato', 'otro'] as Especie[]).map((e) => (
          <Pressable
            key={e}
            onPress={() => cambiarEspecie(e)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
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

      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.descripcion')}</Text>
      <TextInput
        style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.text }]}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('mascotas.descripcionPlaceholder')}
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />

      <PreguntaBuilder preguntas={preguntas} onChange={setPreguntas} />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedePublicar ? colors.primary : colors.border }]}
        onPress={onPublicar}
        disabled={!puedePublicar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.publicarButton')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  container: { flexGrow: 1, padding: 24, ...centeredContent },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
