"use client";

import type { ListVideosResponse } from "@stream-ops/types";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchVideos, hasProcessingVideos } from "@/lib/videos";

interface UseVideoLibraryOptions {
  initialData?: ListVideosResponse;
  limit: number;
}

export function useVideoLibrary({
  initialData,
  limit,
}: Readonly<UseVideoLibraryOptions>) {
  return useQuery({
    queryKey: ["videos", limit],
    queryFn: () => fetchVideos(limit),
    initialData,
    refetchInterval: (query) => {
      const videos = query.state.data?.videos ?? [];
      return hasProcessingVideos(videos) ? 5_000 : false;
    },
  });
}

export function useVideoLibrarySuspense(limit: number) {
  return useSuspenseQuery({
    queryKey: ["videos", limit],
    queryFn: () => fetchVideos(limit),
    refetchInterval: (query) => {
      const videos = (query.state.data as ListVideosResponse | undefined)?.videos ?? [];
      return hasProcessingVideos(videos) ? 5_000 : false;
    },
  });
}
