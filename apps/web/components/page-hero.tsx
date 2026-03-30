import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: Readonly<PageHeroProps>) {
  return (
    <section
      className={cn(
        "surface-card hero-shell relative overflow-hidden rounded-[2.25rem] border border-border/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(245,237,226,0.9))] p-8 shadow-[0_32px_100px_rgba(28,36,52,0.1)] md:p-10",
        className,
      )}
    >
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <div className="space-y-6 reveal-up">
          <Badge variant="secondary" className="w-fit">
            {eyebrow}
          </Badge>

          <div className="space-y-4">
            <h1 className="font-display text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl xl:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
              {description}
            </p>
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-3 reveal-up delay-1">
              {actions}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="grid gap-3 reveal-up delay-2">{aside}</div>
        ) : null}
      </div>
    </section>
  );
}

interface HeroRailCardProps {
  label: string;
  value: string;
  detail: string;
  className?: string;
}

export function HeroRailCard({
  label,
  value,
  detail,
  className,
}: Readonly<HeroRailCardProps>) {
  return (
    <div
      className={cn(
        "lift-hover rounded-[1.6rem] border border-border/70 bg-white/86 p-5 shadow-[0_18px_56px_rgba(28,36,52,0.08)]",
        className,
      )}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
