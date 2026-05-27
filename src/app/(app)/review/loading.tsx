import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function ReviewLoading() {
  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <Skeleton className="h-3 w-32 mb-2" />
      <Skeleton className="h-8 w-72 mb-1" />
      <Skeleton className="h-4 w-64 mb-7" />

      <div className="bg-slate-200 rounded-2xl p-7 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-2 bg-slate-300" />
              <Skeleton className="h-10 w-24 bg-slate-300" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <SkeletonCard className="lg:col-span-2">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-48 w-full" />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-32 w-full" />
        </SkeletonCard>
        <SkeletonCard className="lg:col-span-3">
          <Skeleton className="h-5 w-48 mb-5" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
