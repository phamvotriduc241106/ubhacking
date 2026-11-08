import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import zhCN from './locales/zh-CN.json';
import hi from './locales/hi.json';
import ptBR from './locales/pt-BR.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import de from './locales/de.json';
import vi from './locales/vi.json';

export const LANGUAGES = [
  {code:'en',name:'English'}, {code:'es',name:'Español'}, {code:'zh-CN',name:'简体中文'},
  {code:'hi',name:'हिन्दी'}, {code:'pt-BR',name:'Português (Brasil)'}, {code:'fr',name:'Français'},
  {code:'ar',name:'العربية'}, {code:'tr',name:'Türkçe'}, {code:'de',name:'Deutsch'}, {code:'vi',name:'Tiếng Việt'},
] as const;
export type Locale = typeof LANGUAGES[number]['code'];
export const LOCALE_KEY = 'folland.language';
const resources = {'en':{translation:en}, 'es':{translation:es}, 'zh-CN':{translation:zhCN}, 'hi':{translation:hi}, 'pt-BR':{translation:ptBR}, 'fr':{translation:fr}, 'ar':{translation:ar}, 'tr':{translation:tr}, 'de':{translation:de}, 'vi':{translation:vi}};

export function resolveLocale(value: string): Locale | undefined {
  const normalized = value.toLowerCase();
  const exact = LANGUAGES.find(l => l.code.toLowerCase() === normalized);
  if (exact) return exact.code;
  const base = normalized.split('-')[0];
  if (base === 'zh') return /(^zh-(tw|hk|mo|hant))/.test(normalized) ? undefined : 'zh-CN';
  if (base === 'pt') return normalized.startsWith('pt-pt') ? undefined : 'pt-BR';
  return LANGUAGES.find(l => l.code === base)?.code;
}

// Always start in English on server and first client render; detection happens after hydration.
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({resources, lng:'en', fallbackLng:'en', interpolation:{escapeValue:false}, initAsync:false});
}
export default i18next;
