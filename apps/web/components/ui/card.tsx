import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: Readonly<CardProps>) {
  return (
    <div
      className={cn(
        "surface-card rounded-[1.75rem] border border-border/70 bg-white/82 shadow-[0_24px_80px_rgba(28,36,52,0.08)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, ...props }: Readonly<CardHeaderProps>) {
  return (
    <div className={cn("flex flex-col gap-3 p-6", className)} {...props} />
  );
}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, ...props }: Readonly<CardTitleProps>) {
  return (
    <h3
      className={cn(
        "font-display text-2xl font-semibold tracking-[-0.03em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({
  className,
  ...props
}: Readonly<CardDescriptionProps>) {
  return (
    <p
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({
  className,
  ...props
}: Readonly<CardContentProps>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, ...props }: Readonly<CardFooterProps>) {
  return (
    <div
      className={cn("flex items-center gap-3 px-6 pb-6 pt-2", className)}
      {...props}
    />
  );
}
