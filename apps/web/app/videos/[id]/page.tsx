'use client'

import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import VideoPlayer from '@/components/videoPlayer'
import api from '@/lib/api'

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

function VideoPageSkeleton() {
	return (
		<main className="mx-auto max-w-3xl p-4 md:p-8">
			<div className="space-y-4">
				<h1 className="text-xl font-semibold">Loading video...</h1>
				<div className="aspect-video w-full animate-pulse rounded-2xl bg-card" />
			</div>
		</main>
	)
}

function VideoPageContent({ videoId }: { videoId: string }) {
	const router = useRouter()

	const { data } = useSuspenseQuery({
		queryKey: ['video', videoId],
		queryFn: () => api.get<GetVideoResponse>(`/api/videos/${videoId}`),
		refetchInterval: (query) => {
			const status = query.state.data?.video.status
			return status === 'ready' ? false : 2_000
		},
	})

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
				<button
					type="button"
					onClick={() => router.push('/upload')}
					className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					Upload another
				</button>
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
				<div className="mt-6 rounded-[1.25rem] border border-border bg-card p-6 space-y-3" aria-busy="true">
					<p className="text-sm">
						Processing is still running. The player will appear as soon as assets are ready.
					</p>
					<p className="text-xs text-muted-foreground">
						You can leave this page—once ready, refresh or open the video again.
					</p>
				</div>
			)}
		</main>
	)
}

export default function Page({ params }: { params: { id: string } }) {
	return (
		<Suspense fallback={<VideoPageSkeleton />}>
			<VideoPageContent videoId={params.id} />
		</Suspense>
	)
}

