import { useSyncExternalStore } from "react";

export type UploadStatus = "uploading" | "completed" | "failed";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
}

class UploadStore {
  private uploads = new Map<string, UploadItem>();
  private listeners = new Set<() => void>();
  private cachedList: UploadItem[] = [];

  private emit() {
    this.cachedList = Array.from(this.uploads.values());
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getAll = () => this.cachedList;

  getById = (id: string): UploadItem | undefined => {
    return this.uploads.get(id);
  };

  add(item: Omit<UploadItem, "progress" | "status">) {
    this.uploads.set(item.id, { ...item, progress: 0, status: "uploading" });
    this.emit();
  }

  updateProgress(id: string, progress: number) {
    const item = this.uploads.get(id);
    if (item && item.progress !== progress) {
      this.uploads.set(id, { ...item, progress });
      this.emit();
    }
  }

  updateStatus(id: string, status: UploadStatus) {
    const item = this.uploads.get(id);
    if (item && item.status !== status) {
      this.uploads.set(id, { ...item, status });
      this.emit();
    }
  }

  remove(id: string) {
    if (this.uploads.delete(id)) {
      this.emit();
    }
  }
}

export const uploadStore = new UploadStore();

export function useUploads() {
  return useSyncExternalStore(
    uploadStore.subscribe,
    uploadStore.getAll,
    uploadStore.getAll,
  );
}
