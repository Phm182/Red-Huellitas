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

AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved && CODIGOS_SOPORTADOS.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => undefined);

export function cambiarIdioma(codigo: string): void {
  i18n.changeLanguage(codigo);
  AsyncStorage.setItem(STORAGE_KEY, codigo).catch(() => undefined);
}

export default i18n;
