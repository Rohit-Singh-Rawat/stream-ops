import { VideoPageClient } from './video-page-client'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return <VideoPageClient videoId={id} />
}

