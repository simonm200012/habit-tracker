import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function CalendarLoading() {
  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <SkeletonCard className="lg:col-span-2">
          <Skeleton className="h-5 w-40 mb-5" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </SkeletonCard>

        <SkeletonCard className="lg:col-span-3">
          <Skeleton className="h-5 w-48 mb-5" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
