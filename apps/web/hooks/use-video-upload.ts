"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { uploadFile } from "@/lib/file-upload";
import { uploadStore, useUploads } from "@/store/uploads";

const ALLOWED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm"];

type DropValidationResult =
  | { ok: true }
  | { ok: false; message: string };

function isSupportedVideoFile(file: File): boolean {
  if (ALLOWED_VIDEO_MIME_TYPES.has(file.type)) {
    return true;
  }

  const normalizedName = file.name.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.some((ext) => normalizedName.endsWith(ext));
}

export function useVideoUpload() {
  const uploads = useUploads();
  const activeUpload =
    uploads.length > 0 ? uploads[uploads.length - 1] : undefined;
  const router = useRouter();
  const [, startTransition] = useTransition();

  const uploadMutation = useMutation({
    mutationFn: async (vars: { file: File; tempId: string }) => {
      return uploadFile(vars.file, {
        onProgress: (loaded) => uploadStore.updateProgress(vars.tempId, loaded),
      });
    },
    onSuccess: ({ fileId, fileName }, vars) => {
      const fileSize = vars.file.size;
      uploadStore.remove(vars.tempId);
      uploadStore.add({ id: fileId, name: fileName, size: fileSize });
      uploadStore.updateProgress(fileId, fileSize);
      uploadStore.updateStatus(fileId, "completed");
      startTransition(() => router.push(`/videos/${fileId}`));
      setTimeout(() => uploadStore.remove(fileId), 3_000);
    },
    onError: (_error, vars) => {
      uploadStore.updateStatus(vars.tempId, "failed");
    },
  });

  const handleFilesDrop = useCallback(
    (files: FileList): DropValidationResult => {
      const file = files[0];
      if (!file) {
        return { ok: false, message: "No file selected." };
      }

      if (!isSupportedVideoFile(file)) {
        return { ok: false, message: "Only MP4 and WebM files are supported." };
      }

      const tempId = crypto.randomUUID();
      uploadStore.add({ id: tempId, name: file.name, size: file.size });
      uploadMutation.mutate({ file, tempId });
      return { ok: true };
    },
    [uploadMutation],
  );

  return {
    activeUpload,
    handleFilesDrop,
    isUploading: uploadMutation.isPending,
  };
}
