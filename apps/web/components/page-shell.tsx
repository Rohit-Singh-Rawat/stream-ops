import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

interface PageShellProps {
  current: "dashboard" | "library" | "upload";
  children: ReactNode;
  className?: string;
}

export function PageShell({
  current,
  children,
  className,
}: Readonly<PageShellProps>) {
  return (
    <main
      className={cn(
        "page-stage min-h-screen px-4 pb-10 pt-4 md:px-8 md:pt-6",
        className,
      )}
    >
      <a
        href="#page-content"
        className="skip-link rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Skip to Content
      </a>

      <div className="mx-auto max-w-7xl space-y-8">
        <SiteHeader current={current} />
        <div id="page-content" className="space-y-8">
          {children}
        </div>
      </div>
    </main>
  );
}
