import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="p-5">
            <Skeleton className="w-10 h-10 mb-3" />
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </SkeletonCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SkeletonCard className="lg:col-span-2">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="h-5 w-24 mb-4" />
          <Skeleton className="h-48 w-full" />
        </SkeletonCard>
        <SkeletonCard className="lg:col-span-2">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-56 w-full" />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-64 w-full" />
        </SkeletonCard>
      </div>
    </main>
  );
}
