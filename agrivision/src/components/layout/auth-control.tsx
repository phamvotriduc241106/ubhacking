'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
export function AuthControl(){const [user,setUser]=useState<User|null>(null);const router=useRouter();useEffect(()=>{const client=browserClient();if(!client)return;client.auth.getUser().then(({data})=>setUser(data.user));const {data}=client.auth.onAuthStateChange((_event,session)=>setUser(session?.user ?? null));return ()=>data.subscription.unsubscribe();},[]);
 if(!user)return <Link href="/login" className="rounded-full px-3 py-2 text-sm">Sign In</Link>;
 return <details className="relative"><summary className="flex cursor-pointer items-center gap-2 text-sm">{user.user_metadata.avatar_url && <img src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full"/>}<span className="hidden md:inline">{user.user_metadata.full_name || 'Account'}</span></summary><div className="glass-strong absolute right-0 mt-2 min-w-40 rounded-2xl p-3"><Link href="/account" className="block p-2">My Account</Link><button className="block p-2" onClick={async()=>{const client=browserClient();if(client){const {error}=await client.auth.signOut();if(!error){setUser(null);router.push('/');router.refresh();}}}}>Sign Out</button></div></details>;
}
