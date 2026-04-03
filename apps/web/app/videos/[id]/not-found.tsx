import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="container mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-muted px-3 py-1 text-sm font-medium">
        404 Not Found
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Video Not Found</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        The video you are looking for does not exist or you do not have permission to view it.
      </p>
      <div className="mt-8">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Return to Library
        </Link>
      </div>
    </div>
  );
}
