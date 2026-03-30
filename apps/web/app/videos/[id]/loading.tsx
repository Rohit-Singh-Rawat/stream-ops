import { HeroRailCard, PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell current="library">
      <PageHero
        eyebrow="Loading Detail"
        title="Preparing the video workspace."
        description="Fetching playback state and metadata so the detail route can settle without layout shifts."
        aside={
          <>
            <HeroRailCard
              label="Route State"
              value="Loading"
              detail="The detail page resolves server data before hydrating the interactive player surface."
            />
            <HeroRailCard
              label="UX Goal"
              value="Stable"
              detail="The layout is reserved up front so controls and metadata do not jump around after render."
              className="delay-1"
            />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 border-b border-border/70 pb-5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="aspect-video w-full rounded-[1.5rem]" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-16 rounded-[1.25rem]" />
              <Skeleton className="h-16 rounded-[1.25rem]" />
              <Skeleton className="h-16 rounded-[1.25rem]" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-5/6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-28 rounded-[1.25rem]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
