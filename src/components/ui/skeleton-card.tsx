import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  lines?: number;
  showHeader?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function SkeletonCard({ lines = 2, showHeader = true, showBadge = false, className }: SkeletonCardProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                {showBadge && <Skeleton className="h-5 w-14 rounded-full" />}
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? '' : 'pt-6'}>
        <div className="space-y-2.5">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 3, ...props }: SkeletonCardProps & { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...props} />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4 text-center space-y-2">
            <Skeleton className="h-4 w-4 mx-auto rounded" />
            <Skeleton className="h-7 w-12 mx-auto" />
            <Skeleton className="h-2.5 w-16 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
