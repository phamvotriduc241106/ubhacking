"use client";
import type { ReactNode } from "react";
import { LocalizedText } from "@/i18n/localized";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Reveal className={cn("flex flex-col items-start gap-4", align === "center" && "items-center text-center", className)}>
      <span className="eyebrow"><LocalizedText text={eyebrow}/></span>
      <h2 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-5xl"><LocalizedText text={title}/></h2>
      {description && <p className={cn("max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}><LocalizedText text={description}/></p>}
      {children}
    </Reveal>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  const {t,i18n}=useTranslation();
  const pathname=usePathname();
  const keys: Record<string,string> = {'/farm':'farm','/dashboard':'dashboard','/analysis':'analysis','/weather':'weather','/growth':'growth','/alerts':'alerts'};
  const localizedTitle = i18n.language !== 'en' && keys[pathname] ? t(keys[pathname]) : title;
  return (
    <div className="relative pt-28 sm:pt-32">
      <div className="container flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow={eyebrow} title={localizedTitle} description={description} />
        {children && <Reveal delay={0.1} className="shrink-0">{children}</Reveal>}
      </div>
    </div>
  );
}
