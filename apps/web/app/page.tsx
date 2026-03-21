import VideoPlayer from '@/components/videoPlayer';

export default function Page() {
	const videoId = 'your-video-id';

	const src = `https://d35tuoe9w8yghk.cloudfront.net/videos/019d1214-5701-7000-8f93-00442424decd/hls/master.m3u8`;
	const vttUrl = `https://d35tuoe9w8yghk.cloudfront.net/videos/019d1214-5701-7000-8f93-00442424decd/thumbnails/thumbnails.vtt`;
	return (
		<div>
			<h1>Player</h1>
			<VideoPlayer src={src} vttUrl={vttUrl} />
		</div>
	);
}
