"use client";

import type {
  GetVideoResponse,
  VideoStatus,
  VideoSummary,
} from "@stream-ops/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoStatusBadge } from "@/components/video-status-badge";
import VideoPlayer from "@/components/videoPlayer";
import api, { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatFileSize,
  formatVideoStatus,
  isProcessingStatus,
} from "@/lib/videos";

interface VideoPageClientProps {
  videoId: string;
  initialData?: GetVideoResponse;
}

interface VideoNarrative {
  eyebrow: string;
  description: string;
  stateDetail: string;
  nextStep: string;
}

function getVideoNarrative(status: VideoStatus): VideoNarrative {
  if (status === "ready") {
    return {
      eyebrow: "Playback Ready",
      description:
        "The pipeline has finished packaging this asset, so operators can review playback, inspect metadata, and move on without leaving the page.",
      stateDetail:
        "Playback output is available and the detail page can serve as the handoff surface for reviewers.",
      nextStep:
        "Review the player, share the detail URL if needed, or jump back into the library to keep triage moving.",
    };
  }

  if (status === "failed") {
    return {
      eyebrow: "Needs Attention",
      description:
        "The source record is preserved, but the playback package did not complete successfully. Keep the asset visible so failures stay diagnosable.",
      stateDetail:
        "The job failed before producing a usable playback package, so the player is intentionally withheld.",
      nextStep:
        "Inspect backend logs, verify the source file, and re-upload if you need a fresh processing run.",
    };
  }

  return {
    eyebrow: "Pipeline Active",
    description:
      "This asset is still moving through upload, queue, or encoding work. The page keeps refreshing while the pipeline is active so operators are not stuck reloading manually.",
    stateDetail:
      "The detail view remains live while packaging is still in progress, then promotes the player as soon as playback assets are ready.",
    nextStep:
      "You can leave this page at any time. The dashboard and library continue reflecting progress across the queue.",
  };
}

function DetailMetric({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="space-y-1">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function VideoPageLoadingState() {
  return (
    <PageShell current="library">
      <PageHero
        eyebrow="Loading Detail"
        title="Preparing the video workspace."
        description="Fetching the latest pipeline snapshot, playback state, and supporting metadata for this asset."
        aside={
          <>
            <HeroRailCard
              label="Playback State"
              value="Syncing"
              detail="Server and client data are aligning before the detail surface becomes interactive."
            />
            <HeroRailCard
              label="Operator View"
              value="Staging"
              detail="The page loads layout and metadata first so the player area can settle cleanly."
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
              <Skeleton className="h-8 w-32 rounded-full" />
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

function VideoPageErrorState({
  title,
  description,
  onRetry,
}: Readonly<{
  title: string;
  description: string;
  onRetry: () => void;
}>) {
  return (
    <PageShell current="library">
      <PageHero
        eyebrow="Detail Unavailable"
        title={title}
        description={description}
        actions={
          <>
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-full",
              )}
            >
              Retry Request
            </button>
            <Link
              href="/videos"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full",
              )}
            >
              Return to Library
            </Link>
          </>
        }
        aside={
          <>
            <HeroRailCard
              label="Recovery"
              value="Immediate"
              detail="Retry the request or move back into the library without losing the broader operating context."
            />
            <HeroRailCard
              label="Fallback"
              value="Safe Route"
              detail="Upload and library surfaces stay available even if this specific detail request fails."
              className="delay-1"
            />
          </>
        }
      />
    </PageShell>
  );
}

function DetailExperience({
  videoId,
  video,
  refreshError,
}: Readonly<{
  videoId: string;
  video: VideoSummary;
  refreshError?: Error;
}>) {
  const router = useRouter();
  const narrative = getVideoNarrative(video.status);
  const isProcessing = isProcessingStatus(video.status);
  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, "");
  const playbackUrl = assetBase
    ? `${assetBase}/videos/${videoId}/hls/master.m3u8`
    : null;
  const vttUrl = assetBase
    ? `${assetBase}/videos/${videoId}/thumbnails/thumbnails.vtt`
    : null;

  return (
    <PageShell current="library">
      <PageHero
        eyebrow={narrative.eyebrow}
        title={video.name}
        description={narrative.description}
        actions={
          <>
            <Link
              href="/videos"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-full",
              )}
            >
              Back to Library
            </Link>
            <Link
              href="/upload"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full",
              )}
            >
              Upload Another Asset
            </Link>
          </>
        }
        aside={
          <>
            <HeroRailCard
              label="Pipeline State"
              value={formatVideoStatus(video.status)}
              detail={narrative.stateDetail}
            />
            <HeroRailCard
              label="Asset Size"
              value={formatFileSize(video.size)}
              detail={`Last updated ${formatDateTime(video.updatedAt)}.`}
              className="delay-1"
            />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <div className="space-y-6">
          {refreshError ? (
            <Card className="border-amber-500/25 bg-[linear-gradient(180deg,rgba(252,244,220,0.94),rgba(255,255,255,0.92))]">
              <CardHeader className="gap-3 pb-4">
                <Badge variant="warning" className="w-fit">
                  Live Refresh Paused
                </Badge>
                <CardTitle className="text-2xl">
                  Showing the last successful snapshot.
                </CardTitle>
                <CardDescription>
                  The page still has usable data, but the newest refresh failed:{" "}
                  {refreshError.message}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader className="gap-5 border-b border-border/70 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">Detail Surface</Badge>
                  <VideoStatusBadge status={video.status} />
                  <Badge variant={isProcessing ? "warning" : "default"}>
                    {isProcessing ? "Auto Refresh On" : "Snapshot Stable"}
                  </Badge>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Video ID
                </p>
              </div>

              <div className="space-y-3">
                <p className="break-all font-mono text-sm text-foreground">
                  {videoId}
                </p>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {narrative.nextStep}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {video.status === "ready" ? (
                playbackUrl ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-black/95">
                      <VideoPlayer
                        src={playbackUrl}
                        vttUrl={vttUrl ?? undefined}
                        title={video.name}
                        description={`Video ID: ${videoId}`}
                        onBack={() => router.push("/videos")}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">HLS Playback Ready</Badge>
                      <Badge variant="secondary">Thumbnail Scrubbing</Badge>
                      <Badge className="border-border/60 bg-white/70 text-muted-foreground">
                        Operator Review Surface
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <section className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 p-6">
                    <Badge variant="destructive">Configuration Needed</Badge>
                    <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
                      Playback is ready, but the asset base URL is missing.
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Set{" "}
                      <span className="font-semibold">
                        NEXT_PUBLIC_ASSET_BASE_URL
                      </span>{" "}
                      so the client can resolve the HLS manifest and thumbnail
                      track for this asset.
                    </p>
                  </section>
                )
              ) : video.status === "failed" ? (
                <section className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 p-6">
                  <Badge variant="destructive">Pipeline Failed</Badge>
                  <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    Playback could not be produced for this asset.
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Keep this record visible for debugging, then re-upload after
                    the pipeline issue has been resolved.
                  </p>
                </section>
              ) : (
                <section
                  className="rounded-[1.5rem] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(252,244,220,0.94),rgba(255,255,255,0.92))] p-6"
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="warning">Processing In Flight</Badge>
                    <p className="text-sm text-muted-foreground">
                      Polling every 2 seconds while the pipeline stays active.
                    </p>
                  </div>

                  <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
                    The player will appear automatically when packaging
                    finishes.
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    This view keeps updating so operators can hold context while
                    upload, queue, and transcode steps complete in the
                    background.
                  </p>

                  <div className="mt-6 overflow-hidden rounded-full bg-amber-100/80">
                    <div className="h-2 w-2/3 rounded-full bg-[linear-gradient(90deg,#b45309,#f59e0b,#fbbf24)] [background-size:200%_100%] [animation:shimmer_1.8s_linear_infinite]" />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-border/60 bg-white/80 p-4">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Current State
                      </p>
                      <p className="mt-2 text-base font-medium text-foreground">
                        {formatVideoStatus(video.status)}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-border/60 bg-white/80 p-4">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Last Activity
                      </p>
                      <p className="mt-2 text-base font-medium text-foreground">
                        {formatDateTime(video.updatedAt)}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-3">
              <CardTitle>Asset Metadata</CardTitle>
              <CardDescription>
                Keep the source facts close to the playback and processing
                surface so operators do not need to cross-reference raw IDs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5">
                <DetailMetric label="Name" value={video.name} />
                <Separator />
                <DetailMetric
                  label="Source Type"
                  value={video.type.replace(/^video\//, "").toUpperCase()}
                />
                <Separator />
                <DetailMetric
                  label="Created"
                  value={formatDateTime(video.createdAt)}
                />
                <Separator />
                <DetailMetric
                  label="Last Updated"
                  value={formatDateTime(video.updatedAt)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3">
              <CardTitle>Operator Notes</CardTitle>
              <CardDescription>
                The detail route should guide the next action instead of making
                teams decode the pipeline state from backend terms alone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(239,244,245,0.72))] p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Recommended Next Step
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {narrative.nextStep}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/videos"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "default" }),
                    "rounded-full",
                  )}
                >
                  Return to Library
                </Link>
                <Link
                  href="/upload"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "rounded-full",
                  )}
                >
                  Upload Another
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function VideoPageClient({
  videoId,
  initialData,
}: Readonly<VideoPageClientProps>) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => api.get<GetVideoResponse>(`/api/videos/${videoId}`),
    initialData,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const status = query.state.data?.video.status;
      return status && !isProcessingStatus(status) ? false : 2_000;
    },
    retry: (failureCount, requestError) => {
      if (
        requestError instanceof ApiError &&
        (requestError.status === 400 || requestError.status === 404)
      ) {
        return false;
      }

      return failureCount < 2;
    },
  });

  const video = data?.video;

  if (!video && isLoading) {
    return <VideoPageLoadingState />;
  }

  if (!video) {
    const status = error instanceof ApiError ? error.status : undefined;

    return (
      <VideoPageErrorState
        title={
          status === 404
            ? "This video is no longer available."
            : "Unable to load this video detail."
        }
        description={
          status === 404
            ? "The asset may have been removed or never finished uploading. Return to the library to browse the current tracked set."
            : (error?.message ??
              "The request did not complete successfully. Retry the request or continue working from the library.")
        }
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <DetailExperience
      videoId={videoId}
      video={video}
      refreshError={error ?? undefined}
    />
  );
}
