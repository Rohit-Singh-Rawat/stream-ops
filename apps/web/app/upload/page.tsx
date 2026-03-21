'use client'

import { useState, useCallback, useRef, type DragEvent, type KeyboardEvent, type ChangeEvent } from 'react'
import { startUploadProcess, useUploads, type UploadItem } from '@/store/uploads'
import { Upload01Icon, CheckmarkCircle01Icon, Cancel01Icon, VideoReplayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'

function UploadProgressCard({ upload }: { upload: UploadItem }) {
  const progressPercent = upload.size > 0 
    ? Math.min(Math.round((upload.progress / upload.size) * 100), 100) 
    : 0

  const isCompleted = upload.status === 'completed'
  const isFailed = upload.status === 'failed'

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-[1.25rem] bg-card border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      role="status"
      aria-live="polite"
    >
      <div 
        className={cn(
          "h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-200 ease-out",
          isCompleted ? "bg-primary text-primary-foreground" :
          isFailed ? "bg-destructive text-destructive-foreground" :
          "bg-secondary text-secondary-foreground"
        )}
      >
        {isCompleted ? (
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} aria-hidden="true" />
        ) : isFailed ? (
          <HugeiconsIcon icon={Cancel01Icon} size={20} aria-hidden="true" />
        ) : (
          <HugeiconsIcon icon={Upload01Icon} size={20} className="animate-pulse" aria-hidden="true" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-sm font-medium text-foreground truncate pr-2" title={upload.name}>
            {upload.name}
          </p>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {progressPercent}%
          </span>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden isolate relative">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 w-full rounded-full transition-transform duration-200 ease-out origin-left will-change-transform",
              isCompleted ? "bg-primary" : isFailed ? "bg-destructive" : "bg-primary"
            )}
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
        
        <div className="mt-2 text-xs font-medium text-muted-foreground capitalize flex justify-between">
          <span>{(upload.size / (1024 * 1024)).toFixed(1)} MB</span>
          <span>{upload.status}</span>
        </div>
      </div>
    </div>
  )
}

function UploadDropzone({ activeUpload, onFilesDrop }: { activeUpload?: UploadItem; onFilesDrop: (files: FileList) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUploading = activeUpload?.status === 'uploading'

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (!isUploading) setIsDragging(true)
  }, [isUploading])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (isUploading) return
    if (e.dataTransfer.files?.length > 0) {
      onFilesDrop(e.dataTransfer.files)
    }
  }, [isUploading, onFilesDrop])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesDrop(e.target.files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFilesDrop])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }, [isUploading])

  return (
    <div
      role="button"
      tabIndex={isUploading ? -1 : 0}
      aria-label="Upload video file"
      aria-disabled={isUploading}
      className={cn(
        "relative w-full group flex flex-col items-center justify-center p-10 text-center transition-all duration-200 ease-out",
        "border border-dashed rounded-[2rem]",
        isUploading 
          ? "border-border/50 bg-secondary/20 cursor-not-allowed opacity-60" 
          : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/50 cursor-pointer active:scale-[0.97]",
        isDragging && !isUploading ? "border-primary bg-primary/5 scale-[0.99]" : "",
        !isUploading ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
        aria-hidden="true"
      />
      
      <div className="relative mb-5">
        <div className={cn(
          "h-14 w-14 rounded-[1.15rem] flex items-center justify-center transition-all duration-200 ease-out will-change-transform",
          isUploading ? "bg-secondary text-muted-foreground" : 
          isDragging ? "bg-primary text-primary-foreground scale-[1.05]" : 
          "bg-secondary text-secondary-foreground group-hover:scale-[1.05] group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm"
        )}>
          <HugeiconsIcon icon={Upload01Icon} size={28} aria-hidden="true" />
        </div>
      </div>
      
      <h3 className="text-base font-medium text-foreground mb-1.5">
        {isDragging ? "Drop video here" : "Select or drop video"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[260px] text-balance">
        Supports MP4 and WebM formats up to 2GB
      </p>
    </div>
  )
}

export default function UploadPage() {
  const uploads = useUploads()
  const activeUpload = uploads.length > 0 ? uploads[uploads.length - 1] : undefined

  const handleFilesDrop = useCallback((files: FileList) => {
    const file = files[0]
    if (file) {
      startUploadProcess(file, null)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 ease-out" aria-labelledby="upload-heading">
        <header className="flex flex-col items-center text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-secondary/50 rounded-xl mb-1 transition-transform duration-200 ease-out">
            <HugeiconsIcon icon={VideoReplayIcon} size={24} className="text-foreground" />
          </div>
          <div className="space-y-1">
            <h1 id="upload-heading" className="text-2xl font-semibold tracking-tight text-foreground">
              Upload Media
            </h1>
            <p className="text-sm text-muted-foreground">
              Securely upload your video assets for processing
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <UploadDropzone activeUpload={activeUpload} onFilesDrop={handleFilesDrop} />
          {activeUpload && <UploadProgressCard upload={activeUpload} />}
        </section>
      </div>
    </main>
  )
}
