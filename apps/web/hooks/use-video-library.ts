"use client";

import type { ListVideosResponse } from "@stream-ops/types";
import { useQuery } from "@tanstack/react-query";
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
