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

export default function NotFound() {
  return (
    <PageShell current="library">
      <PageHero
        eyebrow="Video Missing"
        title="That detail route does not map to a current asset."
        description="Operators should never need to memorize IDs, so the fastest recovery path is to head back into the searchable library or start a fresh upload."
        actions={
          <>
            <Link
              href="/videos"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-full",
              )}
            >
              Open the Library
            </Link>
            <Link
              href="/upload"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full",
              )}
            >
              Upload a New Asset
            </Link>
          </>
        }
        aside={
          <>
            <HeroRailCard
              label="Best Recovery"
              value="Browse"
              detail="The library now replaces manual ID guessing with searchable discovery and status filters."
            />
            <HeroRailCard
              label="Fresh Start"
              value="Upload"
              detail="If this asset never completed, the upload workspace gives operators the shortest path back into the pipeline."
              className="delay-1"
            />
          </>
        }
      />

      <Card>
        <CardHeader className="gap-3">
          <Badge variant="warning" className="w-fit">
            Detail Route Not Found
          </Badge>
          <CardTitle className="text-3xl">
            The link is stale, malformed, or the asset is no longer tracked.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            This route only works for current video records. Use the library to
            locate an existing asset or re-ingest the source file if the job was
            never created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/videos"
            className={cn(
              buttonVariants({ variant: "secondary", size: "default" }),
              "rounded-full",
            )}
          >
            Browse All Assets
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "rounded-full",
            )}
          >
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}
