'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { browserClient } from '@/lib/supabase/browser';
import { safeNext } from '@/lib/supabase/redirect';
import Link from 'next/link';
export default function Login(){
 const {t}=useTranslation();
 const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 async function login(){setLoading(true);setError('');const client=browserClient();if(!client){setError(t('auth_unconfigured'));setLoading(false);return;} const next=safeNext(new URLSearchParams(window.location.search).get('next')); const callback=new URL('/auth/callback',window.location.origin);callback.searchParams.set('next',next);const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString(),queryParams:{prompt:'select_account'}}});if(result.error){setError(t('auth_failed'));setLoading(false);}}
 return <div className="mx-auto max-w-lg px-6 py-32"><div className="glass rounded-3xl p-8"><p className="font-display text-xl font-bold">FolLand</p><h1 className="mt-8 font-display text-3xl">{t("auth_welcome")}</h1><p className="mt-3 text-muted-foreground">{t("auth_description")}</p><button className="mt-8 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50" onClick={login} disabled={loading}>{loading?t('auth_signing'):t('auth_continue')}</button>{(error || (typeof window!=='undefined' && new URLSearchParams(window.location.search).has('error'))) && <p role="alert" className="mt-4 text-red-500">{error || t('auth_failed')}</p>}<p className="mt-6 text-xs text-muted-foreground">{t("auth_privacy")}</p><Link href="/" className="mt-5 block text-sm underline">{t("auth_home")}</Link></div></div>;
}
