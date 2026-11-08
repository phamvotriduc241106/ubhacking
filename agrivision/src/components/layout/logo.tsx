import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="FolLand home">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-forest-700 shadow-[0_6px_20px_-6px_rgba(16,185,129,0.8)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-cream-50" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21c0-6 0-9 5-13" />
          <path d="M12 14C7 14 4.5 11 4.5 6.5 9 6.5 12 9 12 14Z" fill="currentColor" fillOpacity="0.25" />
          <circle cx="17.5" cy="7.5" r="2.5" fill="#e6cc85" stroke="none" />
        </svg>
        <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight">
        FolLand
      </span>
    </Link>
  );
}
