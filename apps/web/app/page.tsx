import { Suspense } from 'react';
import { HomeVideoGridClient, HomeVideoGridSkeleton } from './home-page-client';
import { DeleteAllVideosButton } from '@/components/delete-all-videos-button';

export const dynamic = 'force-dynamic';

export default function HomePage() {
	return (
		<div className='mx-auto w-full max-w-[1600px] px-6 lg:px-8 py-10'>
			<div className='flex items-center justify-between'>
				<h2 className='text-2xl font-light text-zinc-100 tracking-tight mb-6'>Videos</h2>
				<div className='mb-6'>
					<DeleteAllVideosButton />
				</div>
			</div>

			<Suspense fallback={<HomeVideoGridSkeleton />}>
				<HomeVideoGridClient />
			</Suspense>
		</div>
	);
}
