import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] bg-[linear-gradient(110deg,rgba(255,255,255,0.7),rgba(241,235,226,0.98),rgba(255,255,255,0.7))] bg-[length:200%_100%] motion-safe:animate-[shimmer_1.6s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}
