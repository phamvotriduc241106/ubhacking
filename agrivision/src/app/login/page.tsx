'use client';
import { useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { safeNext } from '@/lib/supabase/redirect';
import Link from 'next/link';
export default function Login(){
 const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 async function login(){setLoading(true);setError('');const client=browserClient();if(!client){setError('Sign-in is not configured.');setLoading(false);return;} const next=safeNext(new URLSearchParams(window.location.search).get('next')); const callback=new URL('/auth/callback',window.location.origin);callback.searchParams.set('next',next);const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString(),queryParams:{prompt:'select_account'}}});if(result.error){setError('Authentication failed. Please try again.');setLoading(false);}}
 return <div className="mx-auto max-w-lg px-6 py-32"><div className="glass rounded-3xl p-8"><p className="font-display text-xl font-bold">FolLand</p><h1 className="mt-8 font-display text-3xl">Welcome to FolLand</h1><p className="mt-3 text-muted-foreground">Understand your crops and make better farming decisions.</p><button className="mt-8 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50" onClick={login} disabled={loading}>{loading?'Signing in…':'Continue with Google'}</button>{(error || (typeof window!=='undefined' && new URLSearchParams(window.location.search).has('error'))) && <p role="alert" className="mt-4 text-red-500">{error || 'Authentication failed. Please try again.'}</p>}<p className="mt-6 text-xs text-muted-foreground">Your account information is used to sign you in.</p><Link href="/" className="mt-5 block text-sm underline">Back to homepage</Link></div></div>;
}
