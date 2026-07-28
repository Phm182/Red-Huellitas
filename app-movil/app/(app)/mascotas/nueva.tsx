import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mascotasApi } from '../../../src/api/mascotasApi';
import { ImagePickerField } from '../../../src/components/ImagePickerField';
import { MultiImagePickerField } from '../../../src/components/MultiImagePickerField';
import { RazaPicker } from '../../../src/components/RazaPicker';
import { Especie, Sexo, Visibilidad } from '../../../src/types';
import { ESPECIES, especieI18nKey } from '../../../src/constants/especies';

import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { AppInput } from '../../../src/components/AppInput';

export default function NuevaMascotaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [edadAnios, setEdadAnios] = useState('');
  const [edadMeses, setEdadMeses] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [disponibleParaMatch, setDisponibleParaMatch] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [carnetUri, setCarnetUri] = useState<string | null>(null);
  const [carnetVisibilidad, setCarnetVisibilidad] = useState<Visibilidad>('privada');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiarEspecie = (nueva: Especie) => {
    setEspecie(nueva);
    setRazaId(null);
    setRazaTexto(null);
  };

  const puedeGuardar = nombre.trim().length > 0 && (razaId !== null || !!razaTexto?.trim());

  const onGuardar = async () => {
    if (!puedeGuardar) return;
    setError(null);
    setSubmitting(true);
    const res = await mascotasApi.crear({
      nombre: nombre.trim(),
      sexo,
      especie,
      razaId,
      razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
      edadAnios: edadAnios ? parseInt(edadAnios, 10) : null,
      edadMeses: edadMeses ? parseInt(edadMeses, 10) : null,
      descripcion: descripcion.trim() || undefined,
      disponibleParaMatch,
      carnetVisibilidad,
      fotos,
      carnetUri,
    });
    setSubmitting(false);
    if (res.success) {
      router.replace('/(app)/mascotas');
    } else {
      setError(res.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.nombre')}</Text>
      <AppInput
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
          <AppInput
            value={edadAnios}
            onChangeText={setEdadAnios}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.edadMeses')}</Text>
          <AppInput
            value={edadMeses}
            onChangeText={setEdadMeses}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.especie')}</Text>
      <View style={styles.segmented}>
        {ESPECIES.map((e) => (
          <Pressable
            key={e}
            onPress={() => cambiarEspecie(e)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: especie === e ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: especie === e ? colors.primaryText : colors.primary, fontWeight: '600' }}>
              {t(especieI18nKey(e))}
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
      <AppInput style={styles.textarea}
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder={t('mascotas.descripcionPlaceholder')}
        multiline
      />

      <MultiImagePickerField label={t('mascotas.fotos')} uris={fotos} onChange={setFotos} addLabel={t('mascotas.addFoto')} />

      <ImagePickerField
        label={t('mascotas.carnetVacunas')}
        uri={carnetUri}
        onChange={setCarnetUri}
        uploadLabel={t('mascotas.carnetUpload')}
        retakeLabel={t('onboarding.retakePhoto')}
      />
      {carnetUri ? (
        <View style={styles.segmented}>
          {(['privada', 'publica'] as Visibilidad[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setCarnetVisibilidad(v)}
              style={[
                styles.segment,
                { borderColor: colors.primary, backgroundColor: carnetVisibilidad === v ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: carnetVisibilidad === v ? colors.primaryText : colors.primary, fontSize: 12 }}>
                {t(v === 'publica' ? 'mascotas.carnetVisibilityPublic' : 'mascotas.carnetVisibilityPrivate')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('mascotas.disponibleParaMatch')}</Text>
        <Switch value={disponibleParaMatch} onValueChange={setDisponibleParaMatch} />
      </View>

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedeGuardar ? colors.primary : colors.border }]}
        onPress={onGuardar}
        disabled={!puedeGuardar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('mascotas.saveButton')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, ...centeredContent },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  segment: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 20,
  },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
