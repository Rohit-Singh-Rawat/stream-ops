"use client";

import Link from "next/link";
import { HeroRailCard, PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AppErrorBoundary({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <PageShell current="dashboard">
      <PageHero
        eyebrow="Frontend Error"
        title="The control room hit an unexpected client-side failure."
        description="The shell is still intact, but this render path crashed before it could finish. Retry the view or move into another surface while we keep the recovery path simple."
        actions={
          <>
            <button
              type="button"
              onClick={reset}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-full",
              )}
            >
              Retry This View
            </button>
            <Link
              href="/videos"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full",
              )}
            >
              Open the Library
            </Link>
          </>
        }
        aside={
          <>
            <HeroRailCard
              label="Impact"
              value="Scoped"
              detail="The current view failed, but operators can still move to the dashboard, library, or upload workspace."
            />
            <HeroRailCard
              label="Recovery"
              value="One Click"
              detail="A local retry is available before anyone has to reload the entire app."
              className="delay-1"
            />
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b border-border/70 pb-5">
          <Badge variant="destructive" className="w-fit">
            Runtime Failure
          </Badge>
          <CardTitle className="text-3xl">
            This page threw after the shell had already loaded.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            Keep the message short and operator-friendly, but still surface the
            actual error text so debugging does not require opening the console
            first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/5 p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Error Message
            </p>
            <p className="mt-3 break-words text-sm leading-6 text-foreground">
              {error.message ||
                "Retry the view. If the error persists, inspect the failing request or component tree."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary", size: "default" }),
                "rounded-full",
              )}
            >
              Return to Dashboard
            </Link>
            <Link
              href="/upload"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "rounded-full",
              )}
            >
              Open Upload Workspace
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
