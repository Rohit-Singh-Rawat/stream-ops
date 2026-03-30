import Link from "next/link";
import { HeroRailCard, PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import { UploadPanel } from "@/components/upload-panel";
import { VideoLibrary } from "@/components/video-library";
import { getVideosSnapshot } from "@/lib/server-api";

const HOME_VIDEO_LIMIT = 24;

export default async function Page() {
  const initialData = await getVideosSnapshot(HOME_VIDEO_LIMIT).catch(
    () => undefined,
  );
  const summary = initialData?.summary ?? {
    total: 0,
    ready: 0,
    processing: 0,
    failed: 0,
  };

  return (
    <PageShell current="dashboard">
      <PageHero
        eyebrow="Ops Dashboard"
        title="Upload, monitor, and open every video without touching a raw ID."
        description="The entry flow is now built for operators instead of developers: direct ingest, visible queue state, and recent asset discovery all live in one faster surface."
        actions={
          <>
            <Link
              href="/videos"
              className={buttonVariants({ variant: "default", size: "lg" })}
            >
              Browse the Library
            </Link>
            <Link
              href="/upload"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Open Upload Workspace
            </Link>
          </>
        }
        aside={
          <>
            <HeroRailCard
              label="Processing Now"
              value={`${summary.processing}`}
              detail="Live queue state stays visible without bouncing through detail pages."
            />
            <HeroRailCard
              label="Ready Assets"
              value={`${summary.ready}`}
              detail="Playback-ready files can be opened directly from the dashboard or library."
              className="delay-1"
            />
          </>
        }
      />

      <UploadPanel
        title="Drop a File to Start"
        description="Use the inline ingest panel for the fastest route into the pipeline, then hand off to the detail page while the library keeps tracking progress."
      />

      <VideoLibrary
        initialData={initialData}
        limit={HOME_VIDEO_LIMIT}
        title="Recent Video Activity"
        description="A live, operator-friendly window into the latest assets and any jobs still moving through the pipeline."
        previewCount={6}
      />
    </PageShell>
  );
}
