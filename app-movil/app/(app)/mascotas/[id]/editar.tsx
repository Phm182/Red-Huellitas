import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mascotasApi } from '../../../../src/api/mascotasApi';
import { usuariosApi } from '../../../../src/api/usuariosApi';
import { RazaPicker } from '../../../../src/components/RazaPicker';
import { Especie, Mascota, MascotaFoto, Sexo, Visibilidad } from '../../../../src/types';
import { centeredContent } from '../../../../src/theme/layout';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { comprimirImagen } from '../../../../src/utils/imagen';
import { rhMediaUrl } from '../../../../src/utils/media';

export default function EditarMascotaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mascotaId = Number(id);

  const [loading, setLoading] = useState(true);
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [fotos, setFotos] = useState<MascotaFoto[]>([]);

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('macho');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [razaId, setRazaId] = useState<number | null>(null);
  const [razaTexto, setRazaTexto] = useState<string | null>(null);
  const [edadAnios, setEdadAnios] = useState('');
  const [edadMeses, setEdadMeses] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [compartirUsername, setCompartirUsername] = useState('');
  const [compartiendo, setCompartiendo] = useState(false);
  const [carnetVisibilidad, setCarnetVisibilidad] = useState<Visibilidad>('privada');

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      mascotasApi.obtener(mascotaId).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          const m = res.data.mascota;
          setMascota(m);
          setFotos(m.fotos ?? []);
          setNombre(m.nombre);
          setSexo(m.sexo);
          setEspecie(m.especie);
          setRazaId(m.razaId);
          setRazaTexto(m.razaTexto);
          setEdadAnios(m.edadAnios ? String(m.edadAnios) : '');
          setEdadMeses(m.edadMeses ? String(m.edadMeses) : '');
          setDescripcion(m.descripcion ?? '');
          setCarnetVisibilidad(m.carnetVisibilidad);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [mascotaId])
  );

  const onGuardarCampos = async () => {
    setError(null);
    setMensaje(null);
    setGuardando(true);
    const res = await mascotasApi.actualizar(mascotaId, {
      nombre: nombre.trim(),
      sexo,
      especie,
      razaId,
      razaTexto: razaId === null ? razaTexto?.trim() ?? null : null,
      edadAnios: edadAnios ? parseInt(edadAnios, 10) : null,
      edadMeses: edadMeses ? parseInt(edadMeses, 10) : null,
    });
    setGuardando(false);
    if (res.success) {
      setMensaje(t('common.changesSaved'));
    } else {
      setError(res.message);
    }
  };

  const onAgregarFoto = async () => {
    if (fotos.length >= 6) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const comprimida = await comprimirImagen(result.assets[0].uri);
    const res = await mascotasApi.subirFoto(mascotaId, comprimida);
    if (res.success && res.data) {
      setFotos(res.data.fotos);
    }
  };

  const onEliminarFoto = async (mascotaFotoId: number) => {
    const res = await mascotasApi.eliminarFoto(mascotaFotoId);
    if (res.success && res.data) {
      setFotos(res.data.fotos);
    }
  };

  const onSubirCarnet = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const comprimida = await comprimirImagen(result.assets[0].uri);
    const res = await mascotasApi.subirCarnet(mascotaId, comprimida, carnetVisibilidad);
    if (res.success && mascota) {
      setMascota({ ...mascota, carnetDisponible: true, carnetVisibilidad });
    }
  };

  const onCambiarVisibilidadCarnet = async (v: Visibilidad) => {
    setCarnetVisibilidad(v);
    if (mascota?.carnetDisponible) {
      const res = await mascotasApi.cambiarVisibilidadCarnet(mascotaId, v);
      if (res.success) {
        setMascota({ ...mascota, carnetVisibilidad: v });
      }
    }
  };

  const onCompartirCarnet = async () => {
    const username = compartirUsername.trim().replace(/^@/, '');
    if (!username) return;
    setCompartiendo(true);
    const perfil = await usuariosApi.perfilPorUsername(username);
    if (perfil.success && perfil.data) {
      const res = await mascotasApi.compartirCarnet(mascotaId, perfil.data.userId);
      if (res.success) {
        setMensaje(t('mascotas.carnetShared'));
        setCompartirUsername('');
      } else {
        setError(res.message);
      }
    } else {
      setError(perfil.message);
    }
    setCompartiendo(false);
  };

  const onToggleMatch = async (value: boolean) => {
    if (!mascota) return;
    setMascota({ ...mascota, disponibleParaMatch: value });
    await mascotasApi.toggleMatch(mascotaId, value);
  };

  const onEliminar = () => {
    Alert.alert(t('mascotas.deleteConfirmTitle'), t('mascotas.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('mascotas.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          await mascotasApi.eliminar(mascotaId);
          router.replace('/(app)/mascotas');
        },
      },
    ]);
  };

  if (loading || !mascota) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.nombre')}</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={nombre} onChangeText={setNombre} />

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
            onPress={() => {
              setEspecie(e);
              setRazaId(null);
              setRazaTexto(null);
            }}
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
        onChange={(id2, texto) => {
          setRazaId(id2);
          setRazaTexto(texto);
        }}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('mascotas.descripcion')}</Text>
      <TextInput
        style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.text }]}
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      {mensaje ? <Text style={{ color: colors.success, marginBottom: 12 }}>{mensaje}</Text> : null}
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onGuardarCampos} disabled={guardando}>
        {guardando ? <ActivityIndicator color={colors.primaryText} /> : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.save')}</Text>
        )}
      </Pressable>

      <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>
        {t('mascotas.fotos')} ({fotos.length}/6)
      </Text>
      <View style={styles.grid}>
        {fotos.map((f) => (
          <View key={f.mascotaFotoId} style={styles.slot}>
            <Image source={{ uri: rhMediaUrl(f.path) }} style={styles.thumb} />
            <Pressable onPress={() => onEliminarFoto(f.mascotaFotoId)} style={[styles.removeBadge, { backgroundColor: colors.danger }]}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>×</Text>
            </Pressable>
          </View>
        ))}
        {fotos.length < 6 ? (
          <Pressable onPress={onAgregarFoto} style={[styles.slot, styles.addSlot, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.primary, fontSize: 24 }}>+</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>{t('mascotas.carnetVacunas')}</Text>
      <Pressable style={[styles.button, styles.outlineButton, { borderColor: colors.primary }]} onPress={onSubirCarnet}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('mascotas.carnetUpload')}</Text>
      </Pressable>
      <View style={styles.segmented}>
        {(['privada', 'publica'] as Visibilidad[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => onCambiarVisibilidadCarnet(v)}
            style={[styles.segment, { borderColor: colors.primary, backgroundColor: carnetVisibilidad === v ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: carnetVisibilidad === v ? colors.primaryText : colors.primary, fontSize: 12 }}>
              {t(v === 'publica' ? 'mascotas.carnetVisibilityPublic' : 'mascotas.carnetVisibilityPrivate')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{t('mascotas.carnetShare')}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, flex: 1 }]}
          value={compartirUsername}
          onChangeText={setCompartirUsername}
          placeholder={t('mascotas.carnetShareUsernamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.button, styles.outlineButton, { borderColor: colors.primary, paddingHorizontal: 16 }]}
          onPress={onCompartirCarnet}
          disabled={compartiendo || !compartirUsername.trim()}
        >
          {compartiendo ? <ActivityIndicator color={colors.primary} /> : (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('mascotas.carnetShareButton')}</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.switchRow, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('mascotas.disponibleParaMatch')}</Text>
        <Switch value={mascota.disponibleParaMatch} onValueChange={onToggleMatch} />
      </View>

      <Pressable style={[styles.button, { backgroundColor: colors.danger, marginTop: 24 }]} onPress={onEliminar}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{t('mascotas.deleteButton')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flexGrow: 1, padding: 24, ...centeredContent },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
  outlineButton: { borderWidth: 1, backgroundColor: 'transparent', marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slot: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  addSlot: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
