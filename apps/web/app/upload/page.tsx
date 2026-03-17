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
      className="flex items-center gap-4 p-4 rounded-2xl bg-card text-card-foreground border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      role="status"
      aria-live="polite"
    >
      <div 
        className={cn(
          "h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors duration-300 ease-out",
          isCompleted ? "bg-primary/20 text-primary" :
          isFailed ? "bg-destructive/20 text-destructive" :
          "bg-primary/10 text-primary"
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
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1.5">
          <p className="text-sm font-medium text-foreground truncate pr-2" title={upload.name}>
            {upload.name}
          </p>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {progressPercent}%
          </span>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-1.5 mb-1.5 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              isCompleted ? "bg-primary" : isFailed ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="text-xs font-medium text-muted-foreground capitalize flex justify-between">
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
  const progressPercent = activeUpload && activeUpload.size > 0 
    ? Math.min(Math.round((activeUpload.progress / activeUpload.size) * 100), 100) 
    : 0

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
      className="relative rounded-[2.5rem] p-[4px] overflow-hidden transition-all duration-300 ease-out shadow-lg group isolate"
      style={{
        background: isUploading
          ? `conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.5) ${progressPercent}%, transparent ${progressPercent}%)`
          : 'transparent',
      }}
    >
      <div 
        className={cn(
          "absolute inset-0 -z-10 transition-colors duration-300 ease-out",
          isUploading ? "bg-transparent" : "bg-border/50"
        )} 
      />
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label="Upload video file"
        aria-disabled={isUploading}
        className={cn(
          "relative z-10 bg-card rounded-[calc(2.5rem-4px)] flex flex-col items-center justify-center py-20 px-8 text-center transition-all duration-300 ease-out origin-center",
          isUploading ? "cursor-not-allowed opacity-90" : "cursor-pointer active:scale-[0.98] group-hover:bg-accent/50",
          isDragging ? "bg-accent/80 border-transparent scale-[0.98]" : "",
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
        
        <div className="relative mb-8">
          <div className={cn(
            "absolute inset-0 flex items-center justify-center -z-10 transition-all duration-300 ease-out pointer-events-none scale-[2]",
            isDragging ? "opacity-20 text-primary scale-[2.2]" : "opacity-5 text-foreground"
          )}>
            <HugeiconsIcon icon={VideoReplayIcon} size={100} aria-hidden="true" />
          </div>
          
          <div className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl transition-all duration-300 ease-out",
            isDragging ? "bg-primary scale-110 shadow-primary/30" : "bg-primary shadow-primary/20 group-hover:scale-[1.03] group-hover:-translate-y-1 group-hover:shadow-primary/30"
          )}>
            <HugeiconsIcon icon={Upload01Icon} size={28} aria-hidden="true" />
          </div>
        </div>
        
        <h3 className="text-base font-semibold text-card-foreground mb-1">
          Select or drop video
        </h3>
        <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
          Supports MP4 and WebM formats up to 2GB
        </p>
      </div>
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
      <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out" aria-labelledby="upload-heading">
        <header className="flex flex-col items-center text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-card rounded-2xl shadow-sm mb-2 border border-border transition-transform duration-300 hover:scale-105 ease-out">
            <HugeiconsIcon icon={VideoReplayIcon} size={24} className="text-foreground" />
          </div>
          <h1 id="upload-heading" className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Upload Media
          </h1>
          <p className="text-sm text-muted-foreground">
            Securely upload your video assets
          </p>
        </header>

        <section className="space-y-6">
          <UploadDropzone activeUpload={activeUpload} onFilesDrop={handleFilesDrop} />
          {activeUpload && <UploadProgressCard upload={activeUpload} />}
        </section>
      </div>
    </main>
  )
}
