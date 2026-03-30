"use client";

import type { ListVideosResponse, VideoSummary } from "@stream-ops/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { useVideoLibrary } from "@/hooks/use-video-library";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatFileSize,
  formatVideoStatus,
  matchesVideoFilter,
  parseVideoFilter,
  type VideoFilter,
} from "@/lib/videos";

interface VideoLibraryProps {
  initialData?: ListVideosResponse;
  limit: number;
  title: string;
  description: string;
  previewCount?: number;
  syncToUrl?: boolean;
  initialQuery?: string;
  initialFilter?: VideoFilter;
}

const filters: Array<{ label: string; value: VideoFilter }> = [
  { label: "All Assets", value: "all" },
  { label: "Processing", value: "processing" },
  { label: "Ready", value: "ready" },
  { label: "Failed", value: "failed" },
] as const;

const loadingPlaceholders = ["one", "two", "three", "four"] as const;

function MetricCard({
  label,
  value,
  detail,
  tone,
}: Readonly<{
  label: string;
  value: number;
  detail: string;
  tone: "default" | "accent" | "warn" | "danger";
}>) {
  const toneClasses =
    tone === "accent"
      ? "bg-[linear-gradient(180deg,rgba(234,249,242,0.94),rgba(255,255,255,0.9))]"
      : tone === "warn"
        ? "bg-[linear-gradient(180deg,rgba(252,244,220,0.96),rgba(255,255,255,0.92))]"
        : tone === "danger"
          ? "bg-[linear-gradient(180deg,rgba(253,237,237,0.95),rgba(255,255,255,0.9))]"
          : "bg-white/86";

  return (
    <Card className={cn("lift-hover", toneClasses)}>
      <CardHeader className="gap-2 pb-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="font-display text-4xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{detail}</CardDescription>
      </CardContent>
    </Card>
  );
}

function VideoCard({ video }: Readonly<{ video: VideoSummary }>) {
  const actionLabel = video.status === "ready" ? "Watch Asset" : "View Status";

  return (
    <Card className="lift-hover content-auto overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <VideoStatusBadge status={video.status} />
            <div className="space-y-2">
              <CardTitle className="text-[1.9rem] leading-none">
                {video.name}
              </CardTitle>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {video.id}
              </p>
            </div>
          </div>

          <Link
            href={`/videos/${video.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "rounded-full",
            )}
          >
            {actionLabel}
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-[1.4rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(235,244,246,0.74))] p-4">
          <dl className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Asset Size
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatFileSize(video.size)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Updated
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatDateTime(video.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Source Type
              </dt>
              <dd className="mt-1 font-medium text-foreground">{video.type}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Pipeline State
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatVideoStatus(video.status)}
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoLibrary({
  initialData,
  limit,
  title,
  description,
  previewCount,
  syncToUrl = false,
  initialQuery = "",
  initialFilter = "all",
}: Readonly<VideoLibraryProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRoutePending, startTransition] = useTransition();
  const [query, setQuery] = useState(() => initialQuery);
  const [filter, setFilter] = useState<VideoFilter>(() =>
    parseVideoFilter(initialFilter),
  );
  const deferredQuery = useDeferredValue(query);

  const { data, error, isFetching, isLoading } = useVideoLibrary({
    initialData,
    limit,
  });

  useEffect(() => {
    if (!syncToUrl) {
      return;
    }

    if (initialQuery !== query) {
      setQuery(initialQuery);
    }

    const normalizedFilter = parseVideoFilter(initialFilter);

    if (normalizedFilter !== filter) {
      setFilter(normalizedFilter);
    }
  }, [filter, initialFilter, initialQuery, query, syncToUrl]);

  useEffect(() => {
    if (!syncToUrl) {
      return;
    }

    const nextParams = new URLSearchParams();
    const currentParams = new URLSearchParams();

    if (deferredQuery.trim()) {
      nextParams.set("q", deferredQuery.trim());
    }

    if (filter === "all") {
      currentParams.delete("status");
    } else {
      nextParams.set("status", filter);
    }

    if (initialQuery.trim()) {
      currentParams.set("q", initialQuery.trim());
    }

    const normalizedInitialFilter = parseVideoFilter(initialFilter);
    if (normalizedInitialFilter !== "all") {
      currentParams.set("status", normalizedInitialFilter);
    }

    const current = currentParams.toString();
    const next = nextParams.toString();

    if (current === next) {
      return;
    }

    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  }, [
    deferredQuery,
    filter,
    initialFilter,
    initialQuery,
    pathname,
    router,
    syncToUrl,
  ]);

  const videos = data?.videos ?? [];
  const summary = data?.summary ?? {
    total: 0,
    ready: 0,
    processing: 0,
    failed: 0,
  };
  const processingVideos = videos.filter((video) =>
    matchesVideoFilter(video, "processing", ""),
  );
  const filteredVideos = videos.filter((video) =>
    matchesVideoFilter(video, filter, deferredQuery),
  );
  const visibleVideos = previewCount
    ? filteredVideos.slice(0, previewCount)
    : filteredVideos;
  const isEmpty = !isLoading && visibleVideos.length === 0;

  return (
    <section className="space-y-6" aria-labelledby="video-library-title">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tracked Assets"
          value={summary.total}
          detail="The recent operating window currently loaded into the surface."
          tone="default"
        />
        <MetricCard
          label="Ready for Playback"
          value={summary.ready}
          detail="Assets that can open the player immediately."
          tone="accent"
        />
        <MetricCard
          label="Processing Right Now"
          value={summary.processing}
          detail="Uploads still moving through queue, encode, or packaging."
          tone="warn"
        />
        <MetricCard
          label="Needs Attention"
          value={summary.failed}
          detail="Jobs that stalled or failed before publishing playback output."
          tone="danger"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="gap-6 border-b border-border/70 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Library Surface</Badge>
                <Badge
                  className={cn(
                    isFetching || isRoutePending
                      ? "border-primary/20 bg-primary/10 text-foreground"
                      : "border-border/70 bg-white/70 text-muted-foreground",
                  )}
                  aria-live="polite"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      isFetching || isRoutePending
                        ? "bg-primary"
                        : "bg-muted-foreground/50",
                    )}
                  />
                  {isFetching || isRoutePending
                    ? "Refreshing Live View"
                    : "Snapshot Is Current"}
                </Badge>
              </div>

              <div className="space-y-2">
                <h2
                  id="video-library-title"
                  className="font-display text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground"
                >
                  {title}
                </h2>
                <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground md:text-base">
                  {description}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[24rem]">
              <label className="sr-only" htmlFor="video-search">
                Search videos
              </label>
              <Input
                id="video-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by Name or ID..."
              />

              <div className="flex flex-wrap items-center gap-2">
                {filters.map((item) => {
                  const isActive = item.value === filter;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={cn(
                        buttonVariants({
                          variant: isActive ? "default" : "secondary",
                          size: "sm",
                        }),
                        "rounded-full",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredVideos.length} asset
              {filteredVideos.length === 1 ? "" : "s"} visible
            </span>
            {syncToUrl ? (
              <span>Search and status are reflected in the page URL.</span>
            ) : (
              <span>
                This preview highlights the most recent operational window.
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {processingVideos.length > 0 ? (
            <section className="rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(252,244,220,0.8),rgba(255,255,255,0.9))] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Current Queue
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Auto-refresh stays on while these assets are still in
                    motion.
                  </p>
                </div>
                <Badge variant="warning">
                  {processingVideos.length} Active Job
                  {processingVideos.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {processingVideos.slice(0, 4).map((video) => (
                  <div
                    key={video.id}
                    className="rounded-[1.25rem] border border-border/60 bg-white/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {video.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDateTime(video.updatedAt)}
                        </p>
                      </div>
                      <VideoStatusBadge status={video.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {error ? (
            <section className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
              Unable to load the library right now. {error.message}
            </section>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {loadingPlaceholders.map((placeholder) => (
                <Card key={placeholder} className="overflow-hidden">
                  <CardHeader>
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-36 w-full rounded-[1.4rem]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {isEmpty ? (
            <section className="rounded-[1.75rem] border border-dashed border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(238,244,245,0.58))] p-10 text-center">
              <Badge variant="secondary">Nothing Matches Yet</Badge>
              <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
                No assets match this combination.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Clear the search, widen the status filter, or upload a fresh
                source file to repopulate the workspace.
              </p>
            </section>
          ) : null}

          {visibleVideos.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : null}

          {previewCount && filteredVideos.length > previewCount ? (
            <div className="flex justify-end">
              <Link
                href="/videos"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "rounded-full",
                )}
              >
                Open the Full Library
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
