import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: Readonly<InputProps>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-full border border-border/70 bg-white/84 px-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-muted-foreground/80 focus-visible:border-primary/55 focus-visible:ring-3 focus-visible:ring-primary/15",
        className,
        "touch-manipulation",
      )}
      {...props}
    />
  );
}
