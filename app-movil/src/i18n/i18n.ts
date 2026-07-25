import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import ja from './ja.json';
import ko from './ko.json';
import pt from './pt.json';
import ru from './ru.json';
import zh from './zh.json';

export interface IdiomaDisponible {
  codigo: string;
  /** Nombre del idioma en su propio idioma, para mostrar en el selector. */
  nombreNativo: string;
}

/**
 * Top 10 idiomas más hablados globalmente (según la decisión del usuario:
 * es/en de base + los 8 más usados adicionales, todos de escritura
 * izquierda-a-derecha — RTL como árabe/hebreo/urdu queda pendiente de una
 * decisión aparte ya que requiere adaptar los layouts existentes).
 */
export const IDIOMAS_DISPONIBLES: IdiomaDisponible[] = [
  { codigo: 'es', nombreNativo: 'Español' },
  { codigo: 'en', nombreNativo: 'English' },
  { codigo: 'pt', nombreNativo: 'Português' },
  { codigo: 'fr', nombreNativo: 'Français' },
  { codigo: 'de', nombreNativo: 'Deutsch' },
  { codigo: 'it', nombreNativo: 'Italiano' },
  { codigo: 'zh', nombreNativo: '中文' },
  { codigo: 'ja', nombreNativo: '日本語' },
  { codigo: 'ko', nombreNativo: '한국어' },
  { codigo: 'ru', nombreNativo: 'Русский' },
];

const CODIGOS_SOPORTADOS = IDIOMAS_DISPONIBLES.map((i) => i.codigo);
const STORAGE_KEY = '@red_huellitas/idioma';

function detectarIdiomaInicial(): string {
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  if (deviceLocale && CODIGOS_SOPORTADOS.includes(deviceLocale)) {
    return deviceLocale;
  }
  return 'es';
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    zh: { translation: zh },
    ja: { translation: ja },
    ko: { translation: ko },
    ru: { translation: ru },
  },
  lng: detectarIdiomaInicial(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// El init() de arriba corre sincrónicamente con detección por dispositivo
// (AsyncStorage es async, no se puede esperar antes de iniciar i18next).
// Si el usuario ya había elegido un idioma manualmente, lo restauramos acá
// apenas esté disponible — mismo patrón que ThemeProvider con el tema.
// Guard: durante export estático Node no tiene window/localStorage.
if (typeof window !== 'undefined') {
  AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
    if (saved && CODIGOS_SOPORTADOS.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  });
}

/** Cambia el idioma y persiste la elección para futuras sesiones. */
export function cambiarIdioma(codigo: string): void {
  i18n.changeLanguage(codigo);
  if (typeof window !== 'undefined') {
    AsyncStorage.setItem(STORAGE_KEY, codigo);
  }
}

export default i18n;
