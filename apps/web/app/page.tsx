'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'

export default function Page() {
	const router = useRouter()
	const [videoId, setVideoId] = useState('')
	const [, startTransition] = useTransition()

	const onSubmit = (e: FormEvent) => {
		e.preventDefault()
		const trimmed = videoId.trim()
		if (!trimmed) return
		startTransition(() => router.push(`/videos/${trimmed}`))
	}

	return (
		<main className="min-h-screen bg-background p-4 md:p-8">
			<div className="mx-auto max-w-3xl space-y-6">
				<header className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">Stream Ops</h1>
					<p className="text-sm text-muted-foreground">
						Upload a video, then watch it with timeline scrubbing.
					</p>
				</header>

				<section className="rounded-[1.25rem] border border-border bg-card p-6 space-y-4">
					<form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
						<div className="flex-1 space-y-2">
							<label htmlFor="videoId" className="block text-sm font-medium text-foreground">
								Video ID
							</label>
							<input
								id="videoId"
								name="videoId"
								value={videoId}
								onChange={(e) => setVideoId(e.target.value)}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
								placeholder="e.g. 019d1214-5701-7000-8f93-00442424decd"
								aria-describedby="videoIdHelp"
							/>
							<p id="videoIdHelp" className="text-xs text-muted-foreground">
								Used to fetch the processed HLS assets from the API.
							</p>
						</div>

						<button
							type="submit"
							className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Watch
						</button>
					</form>

					<div className="flex items-center justify-between gap-3">
						<Link
							href="/upload"
							className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
						>
							Upload a video
						</Link>
						<p className="text-xs text-muted-foreground">Tip: upload a file to get a new ID.</p>
					</div>
				</section>
			</div>
		</main>
	)
}
