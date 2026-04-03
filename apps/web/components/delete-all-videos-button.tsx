"use client"

import { useState, useTransition } from 'react';
import api, { ApiError } from '@/lib/api';

export function DeleteAllVideosButton() {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const handleClick = () => {
		if (
			!window.confirm(
				'This will permanently delete all videos and their S3 assets. Continue?',
			)
		) {
			return;
		}

		setError(null);

		startTransition(async () => {
			try {
				await api.delete<{ deletedCount: number }>('/api/videos');
				window.location.reload();
			} catch (err) {
				if (err instanceof ApiError) {
					setError(err.message);
					return;
				}
				setError('Failed to delete videos. Please try again.');
			}
		});
	};

	return (
		<div className='flex items-center gap-3'>
			<button
				type='button'
				onClick={handleClick}
				disabled={isPending}
				className="text-red-500 text-xs font-semibold"
				aria-label='Delete all videos and S3 assets'
			>
				{isPending ? 'Deleting…' : 'Delete All Videos'}
			</button>
			{error && (
				<p
					role='status'
					aria-live='polite'
					className='text-[11px] font-normal tracking-wide text-red-400'
				>
					{error}
				</p>
			)}
		</div>
	);
}

