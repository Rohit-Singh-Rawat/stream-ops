import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';

import Providers from './providers';
import './globals.css';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import { VideoIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	title: 'Stream Ops',
	description: 'Operational dashboard for encoding and managing video pipelines.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='en'
			className={cn('font-sans', geist.variable, 'bg-[#0e0d0d] text-zinc-100')}
		>
			<body className='min-h-screen bg-[#0e0d0d] font-sans antialiased text-zinc-300 selection:bg-red-500/30 selection:text-red-100'>
				<Providers>
					<div className='flex min-h-screen flex-col'>
						<header className='w-full bg-[#111111] border-b border-white/5'>
							<div className='mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6 lg:px-8'>
								<div className='flex items-center gap-3'>
									<Link
										href='/'
										className='text-[14px] font-light tracking-wide text-zinc-100 flex items-center gap-2'
									>
										<HugeiconsIcon
											icon={VideoIcon}
											className='size-4 text-primary/50'
										/>
										Stream Ops
									</Link>
								</div>

								{/* Right: Nav & Upload */}
								<div className='flex items-center gap-6 text-[13px] font-medium text-zinc-400'>
									<Link
										href='/upload'
										className='ml-2 inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-1 text-xs text-zinc-200 transition-colors hover:bg-white/5 hover:text-white'
									>
										Upload
									</Link>
								</div>
							</div>
						</header>

				

						<main className='flex-1'>{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
