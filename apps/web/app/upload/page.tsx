import Link from "next/link";
import { HeroRailCard, PageHero } from "@/components/page-hero";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import { UploadPanel } from "@/components/upload-panel";

export default function UploadPage() {
  return (
    <PageShell current="upload">
      <PageHero
        eyebrow="Upload Workspace"
        title="Feed the pipeline without leaving operators guessing."
        description="This is the dedicated ingest surface for drag-and-drop uploads, next-step visibility, and clean handoff into the live video detail flow."
        actions={
          <Link
            href="/videos"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View the Library
          </Link>
        }
        aside={
          <>
            <HeroRailCard
              label="Source Formats"
              value="MP4 / WebM"
              detail="Accepted formats are surfaced right in the panel instead of hidden in docs."
            />
            <HeroRailCard
              label="Next Step"
              value="Auto Route"
              detail="Successful uploads push straight into the detail page while the dashboard keeps tracking background progress."
              className="delay-1"
            />
          </>
        }
      />

      <UploadPanel
        title="Upload Media"
        description="Supports MP4 and WebM source files and immediately hands off processing once the upload finishes."
      />
    </PageShell>
  );
}
