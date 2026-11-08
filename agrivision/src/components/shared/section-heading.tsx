import type { ReactNode } from "react";
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
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-5xl">{title}</h2>
      {description && <p className={cn("max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg", align === "center" && "mx-auto")}>{description}</p>}
      {children}
    </Reveal>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative pt-28 sm:pt-32">
      <div className="container flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        {children && <Reveal delay={0.1} className="shrink-0">{children}</Reveal>}
      </div>
    </div>
  );
}
