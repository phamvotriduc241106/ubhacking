"use client";
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import english from './locales/en.json';

const lookup = new Map(Object.entries(english).filter(([k])=>k.startsWith('ui_')).map(([key,value])=>[value,key]));

/** Render a static string without changing the surrounding component. */
export function Localized({id,fallback}:{id:string;fallback:string}) {
  const {t}=useTranslation();
  return <>{t(id,{defaultValue:fallback})}</>;
}

/** Localize a known UI label; unknown or generated values retain their original text. */
export function LocalizedText({text}:{text:ReactNode}) {
  const {t}=useTranslation();
  if (typeof text !== 'string') return <>{text}</>;
  const key=lookup.get(text.trim());
  if (!key) return <>{text}</>;
  const lead=text.match(/^\s*/)?.[0] ?? '';
  const tail=text.match(/\s*$/)?.[0] ?? '';
  return <>{lead}{t(key,{defaultValue:text.trim()})}{tail}</>;
}
