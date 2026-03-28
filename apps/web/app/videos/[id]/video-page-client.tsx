'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import VideoPlayer from '@/components/videoPlayer'
import api from '@/lib/api'
import { isAxiosError } from 'axios'

type VideoSummary = {
	id: string
	name: string
	size: number
	type: string
	status: string
	createdAt: string
	updatedAt: string
}

type GetVideoResponse = { video: VideoSummary }

export function VideoPageClient({ videoId }: { videoId: string }) {
	const router = useRouter()

	const { data, isLoading, isError, error } = useQuery({
		queryKey: ['video', videoId],
		queryFn: () => api.get<GetVideoResponse>(`/api/videos/${videoId}`),
		refetchInterval: (query) => {
			const status = query.state.data?.video.status
			return status === 'ready' ? false : 2_000
		},
		retry: (failureCount, err) => {
			if (isAxiosError(err) && err.response?.status === 400) {
				return false
			}
			return failureCount < 2
		},
	})

	if (isLoading) {
		return (
			<main className="mx-auto max-w-3xl p-4 md:p-8">
				<div className="space-y-4">
					<h1 className="text-xl font-semibold">Loading video...</h1>
					<div className="aspect-video w-full animate-pulse rounded-2xl bg-card" />
				</div>
			</main>
		)
	}

	if (isError) {
		const status = isAxiosError(error) ? error.response?.status : undefined
		return (
			<main className="mx-auto max-w-3xl p-4 md:p-8">
				<div className="space-y-3 rounded-2xl border border-border bg-card p-6">
					<h1 className="text-lg font-semibold">{status === 400 ? 'Invalid video id' : 'Unable to load video'}</h1>
					<p className="text-sm text-muted-foreground">
						{status === 400
							? 'This URL is not a valid video identifier.'
							: 'The request failed. Try refreshing in a few seconds.'}
					</p>
					<div className="flex gap-3">
						<Link
							href="/upload"
							className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Upload video
						</Link>
						<button
							type="button"
							onClick={() => router.push('/')}
							className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Go home
						</button>
					</div>
				</div>
			</main>
		)
	}

	if (!data?.video) {
		return null
	}

	const video = data.video
	const assetBase = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, '')

	if (!assetBase) {
		return (
			<main className="mx-auto max-w-3xl p-4 md:p-8">
				<p className="text-sm text-destructive">
					Missing <span className="font-semibold">NEXT_PUBLIC_ASSET_BASE_URL</span>.
				</p>
			</main>
		)
	}

	const playbackUrl = `${assetBase}/videos/${videoId}/hls/master.m3u8`
	const vttUrl = `${assetBase}/videos/${videoId}/thumbnails/thumbnails.vtt`

	return (
		<main className="mx-auto max-w-5xl p-4 md:p-8">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">{video.name}</h1>
					<p className="text-sm text-muted-foreground">
						Status: <span className="font-medium">{video.status}</span>
					</p>
				</div>

				<Link
					href="/upload"
					className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					Upload another
				</Link>
			</div>

			{video.status === 'ready' ? (
				<div className="mt-6">
					<VideoPlayer
						src={playbackUrl}
						vttUrl={vttUrl}
						title={video.name}
						description={`Video ID: ${videoId}`}
						onBack={() => router.push('/')}
					/>
				</div>
			) : (
				<div className="mt-6 space-y-3 rounded-[1.25rem] border border-border bg-card p-6" aria-busy="true">
					<p className="text-sm">Processing is still running. The player will appear as soon as assets are ready.</p>
					<p className="text-xs text-muted-foreground">
						You can leave this page—once ready, refresh or open the video again.
					</p>
				</div>
			)}
		</main>
	)
}

