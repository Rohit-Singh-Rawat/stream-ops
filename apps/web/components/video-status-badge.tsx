import type { VideoStatus } from "@stream-ops/types";
import { Badge } from "@/components/ui/badge";
import { formatVideoStatus } from "@/lib/videos";

const statusVariants: Record<
  VideoStatus,
  { badge: "secondary" | "warning" | "success" | "destructive"; dot: string }
> = {
  created: { badge: "secondary", dot: "bg-slate-500" },
  uploading: { badge: "secondary", dot: "bg-sky-500" },
  uploaded: { badge: "secondary", dot: "bg-cyan-600" },
  queued: { badge: "warning", dot: "bg-amber-600" },
  processing: { badge: "warning", dot: "bg-teal-600" },
  ready: { badge: "success", dot: "bg-emerald-700" },
  failed: { badge: "destructive", dot: "bg-red-700" },
};

export function VideoStatusBadge({
  status,
}: Readonly<{ status: VideoStatus }>) {
  const tone = statusVariants[status];

  return (
    <Badge variant={tone.badge}>
      <span aria-hidden="true" className={`size-2 rounded-full ${tone.dot}`} />
      {formatVideoStatus(status)}
    </Badge>
  );
}
