import "server-only";

import type { GetVideoResponse, ListVideosResponse } from "@stream-ops/types";
import { jsonRequest } from "@/lib/http";

const SERVER_API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

export async function getVideosSnapshot(
  limit: number,
): Promise<ListVideosResponse> {
  return jsonRequest<ListVideosResponse>(
    SERVER_API_BASE_URL,
    `/api/videos?limit=${limit}`,
    {
      method: "GET",
      next: { revalidate: 5 },
    },
  );
}

export async function getVideoSnapshot(
  videoId: string,
): Promise<GetVideoResponse> {
  return jsonRequest<GetVideoResponse>(
    SERVER_API_BASE_URL,
    `/api/videos/${videoId}`,
    {
      method: "GET",
      next: { revalidate: 5 },
    },
  );
}
