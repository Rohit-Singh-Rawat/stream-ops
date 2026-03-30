"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { uploadFile } from "@/lib/file-upload";
import { uploadStore, useUploads } from "@/store/uploads";

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
    (files: FileList) => {
      const file = files[0];
      if (!file) {
        return;
      }

      const tempId = crypto.randomUUID();
      uploadStore.add({ id: tempId, name: file.name, size: file.size });
      uploadMutation.mutate({ file, tempId });
    },
    [uploadMutation],
  );

  return {
    activeUpload,
    handleFilesDrop,
    isUploading: uploadMutation.isPending,
  };
}
