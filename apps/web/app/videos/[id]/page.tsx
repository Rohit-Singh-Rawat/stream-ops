import { notFound } from "next/navigation";
import { ApiError } from "@/lib/http";
import { getVideoSnapshot } from "@/lib/server-api";
import { VideoPageClient } from "./video-page-client";

const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!uuidLikePattern.test(id)) {
    notFound();
  }

  try {
    const initialData = await getVideoSnapshot(id);
    return <VideoPageClient videoId={id} initialData={initialData} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return <VideoPageClient videoId={id} />;
  }
}
