import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ja from './locales/ja.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';
import { LANGS } from './catalog.js';

const resources = { en, ja, es, fr, pt, de, ar, hi, zh };
const supported = LANGS.map((l) => l.code);

function applyDir(lng) {
  const lang = (lng || 'en').split('-')[0];
  const meta = LANGS.find((l) => l.code === lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = meta?.dir === 'rtl' ? 'rtl' : 'ltr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(resources).map(([k, v]) => [k, { translation: v }]),
    ),
    fallbackLng: 'en',
    supportedLngs: supported,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: ['localStorage'],
    },
  })
  .then(() => applyDir(i18n.language));

i18n.on('languageChanged', applyDir);

export default i18n;
