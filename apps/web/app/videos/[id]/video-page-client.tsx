"use client";

import type { GetVideoResponse, VideoSummary } from "@stream-ops/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { ApiError } from "@/lib/api";
import { formatFileSize, formatDateTime } from "@/lib/videos";
import VideoPlayer from "@/components/videoPlayer";

interface VideoPageClientProps {
  videoId: string;
  initialData?: GetVideoResponse;
}

function isProcessingStatus(status: string) {
  return ["created", "uploading", "uploaded", "queued", "processing"].includes(status);
}

function VideoMetaStrip({ video }: { video: VideoSummary }) {
	return (
		<dl className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
			<div className="flex flex-col gap-2">
				<dt className="text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">Video ID</dt>
				<dd className="font-mono text-sm font-light text-zinc-300">{video.id}</dd>
			</div>

			<div className="flex flex-col gap-2">
				<dt className="text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">Original Format</dt>
				<dd className="font-mono text-sm font-light text-zinc-300">{video.type}</dd>
			</div>

			<div className="flex flex-col gap-2">
				<dt className="text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">Size</dt>
				<dd className="font-mono text-sm font-light text-zinc-300">{formatFileSize(video.size)}</dd>
			</div>

			<div className="flex flex-col gap-2">
				<dt className="text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">Timestamp</dt>
				<dd className="font-mono text-sm font-light text-zinc-300">{formatDateTime(video.createdAt)}</dd>
			</div>

			<div className="flex flex-col gap-2">
				<dt className="text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">Pipeline Status</dt>
				<dd className="font-mono text-sm font-light text-zinc-300">{video.status}</dd>
			</div>
		</dl>
	);
}

export function VideoPageClient({
  videoId,
  initialData,
}: Readonly<VideoPageClientProps>) {
  const router = useRouter();

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
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10 shadow-2xl flex items-center justify-center">
          <div className="size-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-3/5 animate-pulse rounded bg-zinc-800/60" />
          <div className="h-7 w-28 animate-pulse rounded bg-zinc-800/60" />
        </div>

        <div className="mt-6 border-t border-zinc-800/70 pt-6">
          <dl className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2"
              >
                <dt className="h-4 w-24 animate-pulse rounded bg-zinc-800/60" />
                <dd className="h-5 w-36 animate-pulse rounded bg-zinc-800/60" />
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="container mx-auto max-w-screen-xl px-6 py-24 text-center">
        <h1 className="text-3xl font-light tracking-tight text-red-400">Video Not Found</h1>
        <p className="mt-3 text-zinc-400">
          {error?.message || "The video you are looking for does not exist or has been removed."}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/" className="rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white">
            Return Home
          </Link>
          <button onClick={() => refetch()} className="rounded-full bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, "");
  const playbackUrl = assetBase ? `${assetBase}/videos/${videoId}/hls/master.m3u8` : null;
  const vttUrl = assetBase ? `${assetBase}/videos/${videoId}/thumbnails/thumbnails.vtt` : null;
  const isReady = video.status === "ready";
  const isFailed = video.status === "failed";
  const isProcessing = isProcessingStatus(video.status);

  return (
		<div className="container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
			<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950/90 ring-1 ring-white/5">
				{isReady && playbackUrl ? (
					<VideoPlayer
						src={playbackUrl}
						vttUrl={vttUrl ?? undefined}
						title={video.name}
						description={`Video ID: ${videoId}`}
						onBack={() => router.push("/")}
					/>
				) : isProcessing ? (
					<div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950">
						<div className="size-7 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-500" />
						<p className="mt-6 text-[11px] font-normal tracking-[0.22em] text-zinc-400 uppercase">
							Processing Pipeline Active
						</p>
					</div>
				) : isFailed ? (
					<div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950">
						<p className="text-[11px] font-normal tracking-[0.22em] text-red-400 uppercase">
							Processing Failed
						</p>
					</div>
				) : (
					<div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950">
						<p className="text-[11px] font-normal tracking-[0.22em] text-zinc-400 uppercase">
							Missing Playback URL
						</p>
					</div>
				)}
			</div>

			<div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-100">
					{video.name || video.id}
				</h1>

				<span className="inline-flex items-center rounded-full border border-zinc-800/80 bg-zinc-900/40 px-3 py-1 text-[10px] font-normal uppercase tracking-[0.22em] text-zinc-300">
					{video.status.toUpperCase()}
				</span>
			</div>

			<div className="mt-6 border-t border-zinc-800/70 pt-6">
				<VideoMetaStrip video={video} />
			</div>
		</div>
  );
}
