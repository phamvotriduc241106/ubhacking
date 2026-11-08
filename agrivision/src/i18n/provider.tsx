"use client";
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { LOCALE_KEY, resolveLocale } from './config';

export function LanguageProvider({children}: {children:ReactNode}) {
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(LOCALE_KEY); } catch {}
    const browser = navigator.languages?.map(resolveLocale).find(Boolean);
    const selected = (saved && resolveLocale(saved)) || browser || 'en';
    void i18n.changeLanguage(selected);
    const updateDocument = (locale: string) => {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    };
    updateDocument(selected);
    i18n.on('languageChanged', updateDocument);
    return () => { i18n.off('languageChanged', updateDocument); };
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
