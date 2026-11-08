"use client";
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LOCALE_KEY } from '@/i18n/config';

export function LanguageSelector({mobile=false}:{mobile?:boolean}) {
  const {t, i18n} = useTranslation();
  return <label className={`flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 ${mobile ? 'w-full py-2' : 'h-8'}`}>
    <Globe className="h-4 w-4 shrink-0" aria-hidden="true"/>
    <select aria-label={t('switch_language')} value={i18n.language} onChange={e => {
      const value=e.target.value;
      try { localStorage.setItem(LOCALE_KEY, value); } catch {}
      void i18n.changeLanguage(value);
    }} className={`min-w-0 bg-transparent text-xs outline-none ${mobile ? 'w-full' : 'max-w-[90px] sm:max-w-[140px]'}`}>
      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
    </select>
  </label>;
}
