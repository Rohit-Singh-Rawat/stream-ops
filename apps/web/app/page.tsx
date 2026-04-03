import Link from 'next/link';
import { Suspense } from 'react';
import { getVideosSnapshot } from '@/lib/server-api';
import type { VideoSummary } from '@stream-ops/types';
import { formatFileSize } from '@/lib/videos';
import { VideoPoster } from '@/components/video-poster';
import { DeleteAllVideosButton } from '@/components/delete-all-videos-button';

const HOME_VIDEO_LIMIT = 50;

const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, '') ?? '';

function posterUrls(video: VideoSummary): { full: string; thumb: string } | null {
	if (!video.posterUrl || !video.posterThumbUrl || !ASSET_BASE) return null;
	return {
		full: `${ASSET_BASE}/${video.posterUrl}`,
		thumb: `${ASSET_BASE}/${video.posterThumbUrl}`,
	};
}

async function VideoList() {
	const data = await getVideosSnapshot(HOME_VIDEO_LIMIT).catch(() => undefined);
	const videos = data?.videos ?? [];
	const total = data?.summary?.total ?? 0;

	const totalDisplay = String(total).padStart(2, '0');

	if (videos.length === 0) {
		return (
			<>
				<h2 className='text-2xl font-light text-zinc-100 tracking-tight mb-6 flex items-center gap-2'>
					<span className='text-zinc-500 font-mono text-base inline-flex items-center'>
						<span>{`/${totalDisplay}`}</span>
					</span>
					<span>Videos</span>
				</h2>

				<div className='flex h-[40vh] w-full flex-col items-center justify-center border border-white/5 bg-[#1a1a1a]/50'>
					<p className='text-sm font-medium text-zinc-500 text-center uppercase tracking-widest'>
						Library is empty
					</p>
				</div>
			</>
		);
	}

	return (
		<>
			<div className='flex items-center justify-between '>
				<h2 className='text-2xl font-light text-zinc-100 tracking-tight mb-6 flex items-center gap-2'>
					<span className='text-zinc-500 font-mono text-base inline-flex items-center'>
						<span>{`/${totalDisplay}`}</span>
					</span>
					<span>Videos</span>
				</h2>
				<div className=''>
					<DeleteAllVideosButton />
				</div>
			</div>

			<div className='relative'>
				<div className='grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'>
					{videos.map((video) => (
						<VideoCard
							key={video.id}
							video={video}
						/>
					))}
				</div>
			</div>
		</>
	);
}

function VideoCard({ video }: { video: VideoSummary }) {
	const isProcessing = ['processing', 'uploading', 'queued', 'created'].includes(video.status);
	const isFailed = video.status === 'failed';
	const poster = posterUrls(video);

	return (
		<Link
			href={`/videos/${video.id}`}
			className='group flex flex-col focus-visible:outline-none'
		>
			<div
				className={`relative aspect-[16/10] rounded-sm w-full overflow-hidden bg-[#1a1a1a] transition-all duration-300 ${
					isFailed ? 'border border-[#ff4522]/50' : 'border border-white/5'
				}`}
			>
				{poster ? (
					<VideoPoster
						full={poster.full}
						thumb={poster.thumb}
						name={video.name}
					/>
				) : (
					/* No poster yet: video is still processing or failed */
					<div className='absolute inset-0 flex items-center justify-center'>
						<div className='size-4 rounded-full bg-zinc-700/60' />
					</div>
				)}

				{isProcessing && (
					<div className='absolute bottom-0 left-0 h-[2px] w-[50%] bg-[#2177f1] animate-progress' />
				)}
			</div>

			<div className='mt-3 flex flex-col'>
				<h3 className='line-clamp-1 text-sm font-light tracking-wide text-zinc-100'>
					{video.name || video.id}
				</h3>
				<div className='mt-1 flex items-center gap-2 text-xs font-mono tracking-wide text-[#666]'>
					<span>{formatFileSize(video.size)}</span>

					<span>·</span>
					{isProcessing ? (
						<span className='bg-[#2177f1]/10 text-[#2177f1] border-l-2 border-[#2177f1] px-1.5 py-0.5 uppercase tracking-widest font-semibold flex items-center'>
							TRANSCODING
						</span>
					) : isFailed ? (
						<span className='bg-[#ff4522]/10 text-[#ff4522] border-l-2 border-[#ff4522] px-1.5 py-0.5 uppercase tracking-widest font-semibold flex items-center'>
							CODEC ERROR
						</span>
					) : (
						<span className='uppercase text-[#444] font-semibold tracking-widest'>READY</span>
					)}
				</div>
			</div>
		</Link>
	);
}

function VideoListSkeleton() {
	return (
		<>
			<h2 className='text-2xl sm:text-3xl font-light text-zinc-100 tracking-tight mb-6 flex items-center gap-2'>
				<span className='text-zinc-500 font-mono text-base inline-flex items-center gap-1'>
					<span>/</span>
					<span className='w-10 h-6 rounded bg-[#1a1a1a] animate-pulse inline-block' />
				</span>
				<span>Videos</span>
			</h2>

			<div className='grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3'>
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className='flex flex-col'
					>
						<div className='aspect-[16/10] w-full animate-pulse bg-[#1a1a1a]' />
						<div className='mt-3 pr-12'>
							<div className='h-4 w-full animate-pulse bg-[#1a1a1a]' />
							<div className='mt-2 h-3 w-2/3 animate-pulse bg-[#1a1a1a]' />
						</div>
					</div>
				))}
			</div>
		</>
	);
}

export default function HomePage() {
	return (
		<div className='mx-auto w-full max-w-[1600px] px-6 lg:px-8 py-10'>
			<div className='mb-6 flex items-center justify-end'>
			</div>
			<Suspense fallback={<VideoListSkeleton />}>
				<VideoList />
			</Suspense>
		</div>
	);
}
