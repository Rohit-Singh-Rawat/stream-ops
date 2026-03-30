import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  key: "dashboard" | "library" | "upload";
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/videos", label: "Library", key: "library" },
  { href: "/upload", label: "Upload", key: "upload" },
];

interface SiteHeaderProps {
  current: NavItem["key"];
}

export function SiteHeader({ current }: Readonly<SiteHeaderProps>) {
  return (
    <header className="surface-card sticky top-4 z-40 rounded-[1.75rem] border border-border/70 bg-white/78 p-4 shadow-[0_20px_80px_rgba(23,30,46,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Stream Ops
            </p>
            <p className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-foreground">
              Video Pipeline Control Room
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-emerald-600"
              />
              Live Surfaces
            </Badge>
            <Badge className="border-border/60 bg-white/65 text-muted-foreground">
              Faster First Paint
            </Badge>
          </div>
        </div>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const isCurrent = item.key === current;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: isCurrent ? "default" : "secondary",
                    size: "default",
                  }),
                  "rounded-full",
                  isCurrent
                    ? "shadow-[0_12px_32px_rgba(28,36,52,0.14)]"
                    : "bg-secondary/80 text-foreground hover:bg-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
