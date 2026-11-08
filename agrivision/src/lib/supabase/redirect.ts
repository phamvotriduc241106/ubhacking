export function safeNext(value: string | null): string {
 if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\x00-\x1f]/.test(value)) return '/';
 try { const url=new URL(value,'https://folland.invalid'); return url.origin === 'https://folland.invalid' ? url.pathname+url.search+url.hash : '/'; } catch { return '/'; }
}
