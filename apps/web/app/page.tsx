import VideoPlayer from '@/components/videoPlayer';

export default function Page() {
	const videoId = 'your-video-id';

	const src = `https://d35tuoe9w8yghk.cloudfront.net/019d0b51-0d69-7000-b109-113c5bdf78f9/hls/master.m3u8`;

	return (
		<div>
			<h1>Player</h1>
			<VideoPlayer src={src} />
		</div>
	);
}
