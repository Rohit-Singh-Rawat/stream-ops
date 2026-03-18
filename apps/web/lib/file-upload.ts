import { api } from '@/lib/api'

const PART_CONCURRENCY = 5
const MAX_PART_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500

type SingleUploadDescriptor = {
  type: 'single'
  uploadUrl: string
  key: string
}
type MultipartUploadDescriptor = {
  type: 'multipart'
  uploadId: string
  key: string
  partSize: number
  parts: Array<{ partNumber: number; uploadUrl: string }>
}

type InitiateUploadResponse = {
  file: { id: string; name: string; size: number }
  upload: SingleUploadDescriptor | MultipartUploadDescriptor
}

export interface UploadOptions {
  folderId?: string | null
  onProgress?: (loaded: number) => void
  signal?: AbortSignal
}

export interface UploadResult {
  fileId: string
  fileName: string
}

type UploadSession = {
  fileId: string
  key: string
  multipart?: { uploadId: string }
}

function uploadPartOnce(params: {
  url: string
  body: ArrayBuffer
  contentType?: string
  signal: AbortSignal
  onProgress: (loaded: number) => void
}): Promise<string> {
  const { url, body, contentType, signal, onProgress } = params

  return new Promise<string>((resolve, reject) => {
    if (signal.aborted) {
      return reject(new DOMException('Upload aborted', 'AbortError'))
    }

    const xhr = new XMLHttpRequest()

    const onAbort = () => {
      xhr.abort()
      reject(new DOMException('Upload aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded)
      }
    }

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader('ETag') ?? '')
      } else {
        reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort)
      reject(new Error('Network error during file upload'))
    }

    xhr.open('PUT', url)
    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType)
    }
    xhr.send(body)
  })
}

async function uploadPartWithRetry(params: Parameters<typeof uploadPartOnce>[0]): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_PART_RETRIES; attempt++) {
    if (params.signal.aborted) {
      throw new DOMException('Upload aborted', 'AbortError')
    }

    if (attempt > 0) {
      params.onProgress(0)
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt))
    }

    try {
      return await uploadPartOnce(params)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function runConcurrent<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < tasks.length) {
      const i = cursor++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}

export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const { folderId = null, onProgress, signal } = options
  const abortController = new AbortController()

  const onParentAbort = () => abortController.abort()
  if (signal) {
    if (signal.aborted) throw new DOMException('Upload aborted', 'AbortError')
    signal.addEventListener('abort', onParentAbort, { once: true })
  }

  let session: UploadSession | undefined

  try {
    const { file: createdFile, upload: uploadDesc } = await api.post<InitiateUploadResponse>(
      '/api/videos/upload-url',
      {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        ...(folderId ? { folderId } : {}),
      }
    )

    session = { fileId: createdFile.id, key: uploadDesc.key }

    if (uploadDesc.type === 'single') {
      await uploadPartWithRetry({
        url: uploadDesc.uploadUrl,
        body: await file.arrayBuffer(),
        contentType: file.type || 'application/octet-stream',
        signal: abortController.signal,
        onProgress: (loaded) => onProgress?.(loaded),
      })
    } else {
      session = { ...session, multipart: { uploadId: uploadDesc.uploadId } }
      const partProgress = new Array<number>(uploadDesc.parts.length).fill(0)

      const reportProgress = (i: number, loaded: number) => {
        partProgress[i] = loaded
        const totalLoaded = partProgress.reduce((acc, bytes) => acc + bytes, 0)
        onProgress?.(totalLoaded)
      }

      const tasks = uploadDesc.parts.map((part, i) => async () => {
        const offset = (part.partNumber - 1) * uploadDesc.partSize
        const length = Math.min(file.size - offset, uploadDesc.partSize)
        const body = await file.slice(offset, offset + length).arrayBuffer()

        return uploadPartWithRetry({
          url: part.uploadUrl,
          body,
          signal: abortController.signal,
          onProgress: (loaded) => reportProgress(i, loaded),
        })
      })

      const etags = await runConcurrent(tasks, PART_CONCURRENCY)

      await api.post(`/api/videos/complete`, {
        key: uploadDesc.key,
        uploadId: uploadDesc.uploadId,
        parts: uploadDesc.parts.map((p, i) => ({ partNumber: p.partNumber, etag: etags[i] })),
      })
    }

    return { fileId: createdFile.id, fileName: file.name }
  } catch (err) {
    abortController.abort()

    if (session?.multipart) {
      api
        .post('/api/videos/abort', { key: session.key, uploadId: session.multipart.uploadId })
        .catch(() => undefined)
    }

    throw err instanceof Error ? err : new Error('Unknown error during upload')
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onParentAbort)
    }
  }
}
