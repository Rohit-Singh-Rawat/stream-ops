import { HeroRailCard, PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { VideoLibrary } from "@/components/video-library";
import { getVideosSnapshot } from "@/lib/server-api";
import { parseVideoFilter } from "@/lib/videos";

const LIBRARY_LIMIT = 60;

export default async function VideosPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const initialData = await getVideosSnapshot(LIBRARY_LIMIT).catch(
    () => undefined,
  );
  const resolvedSearchParams = (await searchParams) ?? {};
  const summary = initialData?.summary ?? {
    total: 0,
    ready: 0,
    processing: 0,
    failed: 0,
  };

  return (
    <PageShell current="library">
      <PageHero
        eyebrow="Library"
        title="Every tracked asset, one searchable surface."
        description="The library replaces manual ID entry with browseable discovery, sharable filters, and live queue visibility for anything still in flight."
        aside={
          <>
            <HeroRailCard
              label="Tracked Window"
              value={`${summary.total}`}
              detail="The library intentionally keeps the initial load bounded for fast interaction."
            />
            <HeroRailCard
              label="Failures"
              value={`${summary.failed}`}
              detail="Problem assets stay visible instead of disappearing behind direct links."
              className="delay-1"
            />
          </>
        }
      />

      <VideoLibrary
        initialData={initialData}
        limit={LIBRARY_LIMIT}
        title="Video Library"
        description="Search by name or identifier, filter by status, and open any tracked asset directly from the library."
        initialQuery={resolvedSearchParams.q ?? ""}
        initialFilter={parseVideoFilter(resolvedSearchParams.status)}
        syncToUrl
      />
    </PageShell>
  );
}
