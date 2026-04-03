"use client";

import Image from "next/image";
import { useState } from "react";

interface VideoPosterProps {
	full: string;
	thumb: string;
	name: string;
}

/**
 * Progressive poster reveal:
 * 1. Blurred thumb (320px) displays immediately — small CDN file, no perceptible delay
 * 2. Full poster (1280px) fades in once loaded, replacing the blur
 *
 * Both files are served from CDN and cached indefinitely (poster images are immutable).
 */
export function VideoPoster({ full, thumb, name }: VideoPosterProps) {
	const [fullLoaded, setFullLoaded] = useState(false);

	return (
		<>
			<Image
				src={thumb}
				alt=""
				aria-hidden
				fill
				sizes="320px"
				className="object-cover scale-110 blur-sm"
				priority={false}
			/>
			<Image
				src={full}
				alt={name}
				fill
				sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
				className={`object-cover transition-opacity duration-500 ${fullLoaded ? "opacity-100" : "opacity-0"}`}
				priority={false}
				onLoad={() => setFullLoaded(true)}
			/>
		</>
	);
}
