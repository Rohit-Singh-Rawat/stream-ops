import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: Readonly<SeparatorProps>) {
  return (
    <div
      aria-hidden="true"
      data-orientation={orientation}
      className={cn(
        orientation === "horizontal"
          ? "h-px w-full bg-border/70"
          : "h-full w-px bg-border/70",
        className,
      )}
      {...props}
    />
  );
}
