"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppErrorBoundary({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <div className="container mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
        Runtime Error
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        The application encountered an unexpected error. 
      </p>
      
      <div className="mt-6 w-full rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
        <p className="font-mono text-sm text-destructive">{error.message || "An unknown error occurred."}</p>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Try again
        </button>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
