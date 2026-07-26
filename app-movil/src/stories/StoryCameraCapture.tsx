import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  esAssetVideo,
  normalizarDuracionSegundos,
  probeVideoDurationSeconds,
} from '../utils/mediaDuration';
import { hapticLeve, hapticMedio } from '../utils/haptics';

export type CapturedStoryMedia = {
  uri: string;
  tipo: 'foto' | 'video';
  mimeType: string;
  duracionSegundos: number;
  /** 0.5 = cámara lenta, 1 = normal, 2 = cámara rápida. */
  velocidad?: number;
};

/** Segundos de cuenta regresiva antes de disparar. 0 = sin temporizador. */
const TEMPORIZADORES = [0, 3, 10] as const;

/**
 * Velocidades ofrecidas. Se elige antes de grabar como en TikTok, pero se
 * aplica al reproducir en vez de re-encodear: para el que mira es lo mismo
 * (grabar 10s a 2x se ve en 5s) y no hace falta build nativo.
 */
const VELOCIDADES = [0.5, 1, 2] as const;

type Props = {
  onCaptured: (media: CapturedStoryMedia) => void;
  onClose: () => void;
};

/** Webcam propia en web: expo-camera falla mucho en PC (NotReadableError / facing back). */
function WebLiveCamera({
  facing,
  onReady,
  onError,
  videoRef,
}: {
  facing: 'front' | 'back';
  onReady: () => void;
  onError: (msg: string) => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        const facingMode = facing === 'front' ? 'user' : 'environment';
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const el = videoRef.current;
        if (!el) return;
        el.srcObject = stream;
        el.muted = true;
        el.playsInline = true;
        await el.play();
        onReady();
      } catch (e) {
        onError(e instanceof Error ? e.message : 'camera');
      }
    })();

    return () => {
      cancelled = true;
      const el = videoRef.current;
      if (el) el.srcObject = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, onReady, onError, videoRef]);

  return (
    <video
      ref={(node: HTMLVideoElement | null) => {
        videoRef.current = node;
      }}
      autoPlay
      muted
      playsInline
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: '#000',
      }}
    />
  );
}

function captureFromVideoEl(video: HTMLVideoElement): string | null {
  if (!video.videoWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function StoryCameraCapture({ onCaptured, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const cameraRef = useRef<CameraView>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'front' | 'back'>(isWeb ? 'front' : 'back');
  const [mode, setMode] = useState<'foto' | 'video'>('foto');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [temporizador, setTemporizador] = useState<number>(0);
  const [velocidad, setVelocidad] = useState<number>(1);
  /** Segundos que faltan; null cuando no hay cuenta regresiva corriendo. */
  const [cuenta, setCuenta] = useState<number | null>(null);
  const cuentaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (cuentaRef.current) clearInterval(cuentaRef.current);
  }, []);

  const onWebReady = useCallback(() => {
    setCameraReady(true);
    setMountError(null);
  }, []);

  const onWebError = useCallback(
    (_msg: string) => {
      setMountError(t('historias.cameraPreviewFailed'));
      setCameraReady(false);
    },
    [t]
  );

  const ensurePerms = async () => {
    if (isWeb) {
      // getUserMedia pide permiso al browser; useCameraPermissions a veces miente en web.
      return true;
    }
    let granted = camPerm?.granted;
    if (!granted) {
      const r = await requestCamPerm();
      granted = r.granted;
    }
    if (!granted) return false;
    if (mode === 'video' && !micPerm?.granted) await requestMicPerm();
    return true;
  };

  const emitirDesdeAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const esVideo = esAssetVideo(asset);
    let duracion = normalizarDuracionSegundos(asset.duration);
    if (esVideo && duracion <= 0) duracion = await probeVideoDurationSeconds(asset.uri);
    if (esVideo && duracion <= 0) duracion = 15;
    onCaptured({
      uri: asset.uri,
      tipo: esVideo ? 'video' : 'foto',
      mimeType: asset.mimeType || (esVideo ? 'video/mp4' : 'image/jpeg'),
      duracionSegundos: esVideo ? Math.min(duracion, 60) : 0,
      velocidad: esVideo ? velocidad : 1,
    });
  };

  const onGallery = async () => {
    if (!isWeb) {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      videoMaxDuration: 60,
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      await emitirDesdeAsset(result.assets[0]);
    } finally {
      setBusy(false);
    }
  };

  const startWebRecording = async () => {
    const videoEl = webVideoRef.current;
    let stream = (videoEl?.srcObject as MediaStream | null) ?? null;
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
      }
    } else if (!stream.getAudioTracks().length) {
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        audio.getAudioTracks().forEach((tr) => stream!.addTrack(tr));
      } catch {
        // sin mic sigue
      }
    }

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    // Cuánto duró de verdad la grabación. Antes acá había un 15 fijo, así que
    // grabar 4 segundos daba una barra de recorte de 15: las manijas caían en
    // cualquier lado y el tramo elegido no tenía nada que ver con el video.
    const arrancoEn = Date.now();

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const uri = URL.createObjectURL(blob);
      const transcurrido = (Date.now() - arrancoEn) / 1000;
      // El archivo manda si se lo puede leer; el reloj es el respaldo.
      const medido = await probeVideoDurationSeconds(uri);
      const duracion = medido > 0 ? medido : Math.max(1, Math.round(transcurrido * 10) / 10);
      onCaptured({
        uri,
        tipo: 'video',
        mimeType: 'video/webm',
        duracionSegundos: Math.min(duracion, 60),
        velocidad,
      });
    };
    mediaRecorderRef.current = recorder;
    recorder.start(200);
    setRecording(true);
    setTimeout(() => {
      if (mediaRecorderRef.current === recorder && recorder.state === 'recording') {
        recorder.stop();
        setRecording(false);
      }
    }, 60000);
  };

  const stopWebRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    }
    setRecording(false);
  };

  const disparar = async () => {
    if (mode === 'foto') {
      setBusy(true);
      try {
        if (isWeb) {
          const el = webVideoRef.current;
          const dataUrl = el ? captureFromVideoEl(el) : null;
          if (dataUrl) {
            onCaptured({ uri: dataUrl, tipo: 'foto', mimeType: 'image/jpeg', duracionSegundos: 0 });
          } else {
            setMountError(t('historias.cameraCaptureFailed'));
          }
          return;
        }
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.85,
          skipProcessing: Platform.OS === 'android',
        });
        if (photo?.uri) {
          onCaptured({
            uri: photo.uri,
            tipo: 'foto',
            mimeType: 'image/jpeg',
            duracionSegundos: 0,
          });
        } else {
          setMountError(t('historias.cameraCaptureFailed'));
        }
      } catch {
        setMountError(t('historias.cameraCaptureFailed'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isWeb) {
      if (recording) stopWebRecording();
      else {
        try {
          await startWebRecording();
        } catch {
          setMountError(t('historias.cameraCaptureFailed'));
        }
      }
      return;
    }

    if (!cameraRef.current) {
      setMountError(t('historias.cameraCaptureFailed'));
      return;
    }
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (video?.uri) {
        let duracion = await probeVideoDurationSeconds(video.uri);
        if (duracion <= 0) duracion = 15;
        onCaptured({
          uri: video.uri,
          tipo: 'video',
          mimeType: Platform.OS === 'ios' ? 'video/quicktime' : 'video/mp4',
          duracionSegundos: Math.min(duracion, 60),
          velocidad,
        });
      }
    } catch {
      setMountError(t('historias.cameraCaptureFailed'));
    } finally {
      setRecording(false);
    }
  };

  const cancelarCuenta = () => {
    if (cuentaRef.current) clearInterval(cuentaRef.current);
    cuentaRef.current = null;
    setCuenta(null);
  };

  const onShutter = async () => {
    if (busy) return;

    // Durante la cuenta regresiva el botón cancela: si no, quedarías mirando
    // el número sin forma de arrepentirte.
    if (cuenta !== null) {
      cancelarCuenta();
      return;
    }

    const ok = await ensurePerms();
    if (!ok) return;

    // Cortar una grabación en curso es inmediato: el temporizador es para
    // empezar, no para terminar.
    if (mode === 'video' && recording) {
      void disparar();
      return;
    }

    if (temporizador <= 0) {
      void disparar();
      return;
    }

    setCuenta(temporizador);
    cuentaRef.current = setInterval(() => {
      setCuenta((prev) => {
        if (prev === null) return null;
        if (prev > 1) {
          void hapticLeve();
          return prev - 1;
        }
        cancelarCuenta();
        void hapticMedio();
        void disparar();
        return null;
      });
    }, 1000);
  };

  // Nativo: pedir permiso antes de montar CameraView
  if (!isWeb && !camPerm) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!isWeb && camPerm && !camPerm.granted) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.permText}>{t('historias.cameraPermission')}</Text>
        <Pressable style={styles.permBtn} onPress={requestCamPerm}>
          <Text style={styles.permBtnText}>{t('historias.allowCamera')}</Text>
        </Pressable>
        <Pressable style={{ marginTop: 16 }} onPress={onGallery}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{t('historias.fromGallery')}</Text>
        </Pressable>
        <Pressable style={{ marginTop: 24 }} onPress={onClose}>
          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {isWeb ? (
        <WebLiveCamera
          key={`webcam_${cameraKey}_${facing}`}
          facing={facing}
          videoRef={webVideoRef}
          onReady={onWebReady}
          onError={onWebError}
        />
      ) : (
        <CameraView
          key={`cam_${cameraKey}_${facing}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode={mode === 'video' ? 'video' : 'picture'}
          onCameraReady={() => {
            setCameraReady(true);
            setMountError(null);
          }}
          onMountError={() => {
            if (facing === 'back') {
              setFacing('front');
              setCameraKey((k) => k + 1);
              return;
            }
            setMountError(t('historias.cameraPreviewFailed'));
          }}
        />
      )}

      {!cameraReady && !mountError ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>{t('historias.startingCamera')}</Text>
        </View>
      ) : null}

      {mountError ? (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}>
          <Text style={styles.permText}>{mountError}</Text>
          <Pressable
            style={styles.permBtn}
            onPress={() => {
              setMountError(null);
              setCameraReady(false);
              setCameraKey((k) => k + 1);
            }}
          >
            <Text style={styles.permBtnText}>{t('historias.retryCamera')}</Text>
          </Pressable>
          <Pressable style={{ marginTop: 16 }} onPress={onGallery}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('historias.fromGallery')}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode('foto')} style={styles.modeChip}>
            <Text style={[styles.modeText, mode === 'foto' && styles.modeActive]}>{t('historias.modePhoto')}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('video')} style={styles.modeChip}>
            <Text style={[styles.modeText, mode === 'video' && styles.modeActive]}>{t('historias.modeVideo')}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setCameraReady(false);
            setFacing((f) => (f === 'back' ? 'front' : 'back'));
            setCameraKey((k) => k + 1);
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </Pressable>
      </View>

      {/* Temporizador y velocidad: se eligen antes de disparar, como en TikTok.
          La velocidad sólo tiene sentido en video. */}
      <View style={[styles.opcionesCol, { top: insets.top + 64 }]} pointerEvents="box-none">
        <Pressable
          style={[styles.opcionChip, temporizador > 0 && styles.opcionChipOn]}
          onPress={() => {
            void hapticLeve();
            setTemporizador((v) => {
              const i = TEMPORIZADORES.indexOf(v as (typeof TEMPORIZADORES)[number]);
              return TEMPORIZADORES[(i + 1) % TEMPORIZADORES.length];
            });
          }}
          disabled={recording}
        >
          <Ionicons name="timer-outline" size={17} color="#fff" />
          <Text style={styles.opcionLabel}>
            {temporizador > 0 ? `${temporizador}s` : t('historias.timerOff')}
          </Text>
        </Pressable>

        {mode === 'video' ? (
          <Pressable
            style={[styles.opcionChip, velocidad !== 1 && styles.opcionChipOn]}
            onPress={() => {
              void hapticLeve();
              setVelocidad((v) => {
                const i = VELOCIDADES.indexOf(v as (typeof VELOCIDADES)[number]);
                return VELOCIDADES[(i + 1) % VELOCIDADES.length];
              });
            }}
            disabled={recording}
          >
            <Ionicons name="speedometer-outline" size={17} color="#fff" />
            <Text style={styles.opcionLabel}>{velocidad}x</Text>
          </Pressable>
        ) : null}
      </View>

      {cuenta !== null ? (
        <View style={styles.cuentaOverlay} pointerEvents="none">
          <Text style={styles.cuentaNumero}>{cuenta}</Text>
          <Text style={styles.cuentaHint}>{t('historias.timerCancelHint')}</Text>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable onPress={onGallery} style={styles.sideBtn} disabled={busy || recording}>
          <Ionicons name="images-outline" size={28} color="#fff" />
          <Text style={styles.sideLabel}>{t('historias.gallery')}</Text>
        </Pressable>

        <Pressable
          onPress={onShutter}
          disabled={busy}
          style={[styles.shutter, recording && styles.shutterRecording]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={[styles.shutterInner, recording && styles.shutterInnerRec]} />
          )}
        </Pressable>

        <View style={styles.sideBtn}>
          <Text style={styles.hint}>
            {mode === 'video'
              ? recording
                ? t('historias.tapStop')
                : t('historias.holdRecord')
              : t('historias.tapCapture')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ height: '100%', maxHeight: '100vh', position: 'relative' } as object)
      : null),
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
    zIndex: 4,
  },
  loadingText: { color: '#fff', marginTop: 12, fontWeight: '600' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 5,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modeRow: { flexDirection: 'row', gap: 16 },
  modeChip: { paddingVertical: 6, paddingHorizontal: 4 },
  modeText: { color: 'rgba(255,255,255,0.55)', fontWeight: '700', fontSize: 15 },
  modeActive: { color: '#FFE566' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    zIndex: 5,
  },
  opcionesCol: { position: 'absolute', right: 12, gap: 8, alignItems: 'flex-end', zIndex: 5 },
  opcionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  opcionChipOn: { backgroundColor: 'rgba(226,59,74,0.9)' },
  opcionLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cuentaOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 6,
  },
  cuentaNumero: { color: '#fff', fontSize: 110, fontWeight: '800' },
  cuentaHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8 },
  sideBtn: { width: 72, alignItems: 'center', gap: 4 },
  sideLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRecording: { borderColor: '#FF5C6A' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  shutterInnerRec: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FF5C6A' },
  permText: { color: '#fff', textAlign: 'center', fontSize: 16, marginBottom: 16, lineHeight: 22 },
  permBtn: { backgroundColor: '#E23B4A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '700' },
});
