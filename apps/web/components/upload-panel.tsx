"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/store/uploads";
import { formatFileSize } from "@/lib/videos";

function UploadProgress({ upload }: { upload: UploadItem }) {
  const percent =
    upload.size > 0
      ? Math.min(Math.round((upload.progress / upload.size) * 100), 100)
      : 0;

  const isUploading = upload.status === "uploading";
  const isCompleted = upload.status === "completed";
  const isFailed = upload.status === "failed";
  const statusLabel = upload.status.toUpperCase();

  const badgeClass = isCompleted
    ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-200"
    : isFailed
      ? "border-red-500/25 bg-red-500/8 text-red-200"
      : "border-primary/25 bg-primary/6 text-primary/80";

  return (
    <div className="mt-8 overflow-hidden rounded-md border border-white/5 bg-zinc-950/50 p-5 ring-1 ring-white/5 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-normal text-zinc-100">
            {upload.name}
          </h3>
          <p className="mt-1 text-xs font-mono text-zinc-500">
            {formatFileSize(upload.size)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-normal text-zinc-400 tabular-nums">
            {percent}%
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-normal uppercase tracking-[0.22em]",
              badgeClass,
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/70">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            isFailed ? "bg-red-500" : isCompleted ? "bg-green-500" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-normal text-zinc-500">
          {isUploading
            ? "Uploading to storage. Pipeline starts after upload finishes."
            : isCompleted
              ? "Upload complete. Opening the video page…"
              : "Upload failed. Try again with a different file."}
        </p>

        {isCompleted ? (
          <Link
            href={`/videos/${upload.id}`}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-normal text-zinc-200 transition-colors hover:bg-white/10"
          >
            Open video
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function UploadPanel() {
  const { activeUpload, handleFilesDrop, isUploading } = useVideoUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isUploading) setIsDragging(true);
  }, [isUploading]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading && event.dataTransfer.files.length > 0) {
      const result = handleFilesDrop(event.dataTransfer.files);
      setValidationError(result.ok ? null : result.message);
    }
  }, [isUploading, handleFilesDrop]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      const result = handleFilesDrop(event.target.files);
      setValidationError(result.ok ? null : result.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFilesDrop]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !isUploading) {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  return (
    <div className="mx-auto max-w-3xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload video file"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (isUploading) return;
          setValidationError(null);
          fileInputRef.current?.click();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "group flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-md transition-all duration-300 ease-out",
          isUploading
            ? "cursor-not-allowed opacity-70"
            : isDragging
            ? "bg-zinc-950/70 ring-2 ring-primary/60 backdrop-blur"
            : "bg-zinc-950/50 ring-1 ring-white/10 backdrop-blur hover:ring-white/20"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <div className="flex size-16 items-center justify-center rounded-full bg-zinc-900/50 text-zinc-400 ring-1 ring-white/10 group-hover:text-zinc-100 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform duration-500", isDragging && "scale-110", !isDragging && "group-hover:-translate-y-1")}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </div>
        
        <h2 className="mt-6 text-xl font-light tracking-tight text-zinc-100">
          {isUploading
            ? "Uploading…"
            : isDragging
              ? "Drop your video file here"
              : "Click to select or drag a file"}
        </h2>
        <p className="mt-2 text-sm font-normal text-zinc-500">
          {isUploading ? "Uploading to storage…" : "Accepts MP4 and WebM up to 2GB"}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            MP4 / WebM
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Max 2GB
          </span>
        </div>
      </div>

      {activeUpload && <UploadProgress upload={activeUpload} />}
      {validationError ? (
        <p className="mt-4 text-sm text-red-300">{validationError}</p>
      ) : null}
    </div>
  );
}
