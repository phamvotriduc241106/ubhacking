"use client";

import { motion } from "framer-motion";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAlerts } from "@/hooks/use-alerts";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { StatusPill } from "./status-pill";
import { ThemeToggle } from "./theme-toggle";


export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const alerts = useAlerts();
  const urgent = alerts.filter((a) => a.severity !== "info").length;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 rounded-full px-3 pl-4 transition-all duration-500",
          scrolled || pathname !== "/" ? "glass-strong" : "bg-transparent",
        )}
        aria-label="Main"
      >
        <Logo />
        <ul className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-foreground/[0.07]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                  )}
                  <span className="relative">{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex text-xs h-8 rounded-full border-primary/30 hover:border-primary/60">
            <a href="http://localhost:5173" target="_blank" rel="noreferrer">
              FolLand Advisory
            </a>
          </Button>
          <StatusPill className="hidden sm:inline-flex" />
          <Button variant="ghost" size="icon" asChild aria-label={`${urgent} active alerts`}>
            <Link href="/alerts" className="relative">
              <Bell className="h-4 w-4" />
              {urgent > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{urgent}</span>
              )}
            </Link>
          </Button>
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo />
              <StatusPill className="self-start" />
              <ul className="mt-2 flex flex-col gap-1">
                {[{ href: "/", label: "Home" }, ...NAV].map((n, i) => (
                  <motion.li key={n.href} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <Link
                      href={n.href}
                      className={cn(
                        "block rounded-2xl px-4 py-3 font-display text-lg font-medium transition-colors",
                        (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)) ? "bg-primary/10 text-primary" : "hover:bg-foreground/5",
                      )}
                    >
                      {n.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
