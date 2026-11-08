import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/supabase/redirect';
export async function GET(request: Request){
 const url=new URL(request.url); const code=url.searchParams.get('code'); const client=await serverClient();
 if(code && client){const {error}=await client.auth.exchangeCodeForSession(code); if(!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')),url.origin));}
 return NextResponse.redirect(new URL('/login?error=auth',url.origin));
}
