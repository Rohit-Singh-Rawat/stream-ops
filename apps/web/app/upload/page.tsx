import { UploadPanel } from "@/components/upload-panel";

export default function UploadPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-100">
          Upload Video
        </h1>
        <p className="mt-3 text-sm font-normal text-zinc-500">
          Feed the pipeline with new source files. Processing starts silently.
        </p>
      </div>

      <UploadPanel />
    </div>
  );
}
