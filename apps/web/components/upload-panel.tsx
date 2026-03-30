"use client";

import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Upload01Icon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/store/uploads";

interface UploadPanelProps {
  title?: string;
  description?: string;
  className?: string;
}

const pipelineSteps = [
  "Presign upload & transfer source",
  "Queue transcoding & thumbnail generation",
  "Publish HLS playback assets",
] as const;

function UploadProgressCard({ upload }: Readonly<{ upload: UploadItem }>) {
  const progressPercent =
    upload.size > 0
      ? Math.min(Math.round((upload.progress / upload.size) * 100), 100)
      : 0;
  const isCompleted = upload.status === "completed";
  const isFailed = upload.status === "failed";

  return (
    <section
      className="surface-card lift-hover rounded-[1.5rem] border border-border/70 bg-white/88 p-4 shadow-[0_18px_48px_rgba(23,30,46,0.08)]"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            isCompleted
              ? "bg-primary text-primary-foreground"
              : isFailed
                ? "bg-destructive text-destructive-foreground"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {isCompleted ? (
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={20}
              aria-hidden="true"
            />
          ) : isFailed ? (
            <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
          ) : (
            <HugeiconsIcon
              icon={Upload01Icon}
              size={20}
              className="motion-safe:animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p
              className="truncate text-sm font-medium text-foreground"
              title={upload.name}
            >
              {upload.name}
            </p>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {progressPercent}%
            </span>
          </div>

          <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isFailed ? "bg-destructive" : "bg-primary",
              )}
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-medium capitalize text-muted-foreground">
            <span>{(upload.size / (1024 * 1024)).toFixed(1)}&nbsp;MB</span>
            <span>{upload.status}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadDropzone({
  isUploading,
  onFilesDrop,
}: Readonly<{
  isUploading: boolean;
  onFilesDrop: (files: FileList) => void;
}>) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!isUploading) {
        setIsDragging(true);
      }
    },
    [isUploading],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setIsDragging(false);

      if (isUploading || event.dataTransfer.files.length === 0) {
        return;
      }

      onFilesDrop(event.dataTransfer.files);
    },
    [isUploading, onFilesDrop],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        onFilesDrop(event.target.files);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesDrop],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if ((event.key === "Enter" || event.key === " ") && !isUploading) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [isUploading],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <button
        type="button"
        aria-label="Upload a video file"
        aria-disabled={isUploading}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={cn(
          "press-feedback group relative flex min-h-[320px] w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed p-10 text-center",
          isUploading
            ? "cursor-not-allowed border-border/50 bg-secondary/20 opacity-60"
            : "border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,235,226,0.92))] shadow-[0_22px_80px_rgba(23,30,46,0.08)]",
          isDragging && !isUploading && "border-primary/60 bg-primary/8",
        )}
      >
        <div className="pointer-events-none absolute inset-x-[16%] top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(219,175,77,0.18),transparent_70%)] blur-2xl" />

        <div
          className={cn(
            "mb-6 flex size-16 items-center justify-center rounded-[1.5rem] border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isUploading
              ? "bg-secondary text-muted-foreground"
              : isDragging
                ? "scale-[1.04] bg-primary text-primary-foreground"
                : "bg-white/85 text-foreground group-hover:scale-[1.04] group-hover:bg-primary group-hover:text-primary-foreground",
          )}
        >
          <HugeiconsIcon icon={Upload01Icon} size={30} aria-hidden="true" />
        </div>

        <span className="font-display text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground">
          {isDragging ? "Release to Start Ingest" : "Drop a Master File"}
        </span>
        <span className="mt-3 max-w-[25rem] text-pretty text-sm leading-6 text-muted-foreground">
          Supports MP4 and WebM uploads up to 2&nbsp;GB. The system will queue
          transcoding, generate scrubbing previews, and publish the playback
          package automatically.
        </span>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Badge className="bg-white/75">MP4</Badge>
          <Badge className="bg-white/75">WebM</Badge>
          <Badge className="bg-white/75">Auto Queue</Badge>
          <Badge className="bg-white/75">Preview Thumbnails</Badge>
        </div>
      </button>
    </>
  );
}

export function UploadPanel({
  title = "Upload a New Asset",
  description = "Move from source file to playback package without leaving the workspace.",
  className,
}: Readonly<UploadPanelProps>) {
  const { activeUpload, handleFilesDrop, isUploading } = useVideoUpload();

  return (
    <section
      className={cn(
        "surface-card rounded-[2.1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,243,235,0.93))] p-6 shadow-[0_24px_80px_rgba(23,30,46,0.08)] backdrop-blur",
        className,
      )}
      aria-labelledby="upload-panel-title"
    >
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-white/45 bg-white/80 text-foreground shadow-[0_18px_46px_rgba(23,30,46,0.08)]">
              <HugeiconsIcon
                icon={VideoReplayIcon}
                size={22}
                aria-hidden="true"
              />
            </div>
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                Ingest Workspace
              </Badge>
              <div>
                <h2
                  id="upload-panel-title"
                  className="font-display text-3xl font-semibold tracking-[-0.04em] text-foreground"
                >
                  {title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <UploadDropzone
            isUploading={isUploading}
            onFilesDrop={handleFilesDrop}
          />
        </div>

        <div className="space-y-4">
          <section className="surface-card rounded-[1.7rem] border border-border/70 bg-white/86 p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              What Happens Next
            </p>
            <ol className="mt-4 flex flex-col gap-4">
              {pipelineSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-foreground">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="surface-card rounded-[1.7rem] border border-border/70 bg-white/86 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Accepted Sources
              </p>
              <Badge>2&nbsp;GB Max</Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-secondary/55 p-4">
                <p className="text-sm font-medium text-foreground">Playback</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  HLS output with scrub thumbnails and route-ready detail pages.
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-secondary/55 p-4">
                <p className="text-sm font-medium text-foreground">Tracking</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Status stays visible in the dashboard and full library.
                </p>
              </div>
            </div>
          </section>

          {activeUpload ? (
            <UploadProgressCard upload={activeUpload} />
          ) : (
            <section className="surface-card rounded-[1.7rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(232,241,244,0.78))] p-5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Ready to Queue
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">
                Drop a source file and the app will route you directly to the
                live video detail page while the pipeline keeps working in the
                background.
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
