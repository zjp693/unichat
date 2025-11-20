import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md',
        'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300',
        'bg-[length:200%_100%]',
        'animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
