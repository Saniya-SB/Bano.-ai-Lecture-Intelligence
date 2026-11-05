import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse-subtle rounded-md bg-bano-surface-sunken", className)}
      {...props}
    />
  );
}

export { Skeleton };
