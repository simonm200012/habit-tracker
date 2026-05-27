import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function HabitsLoading() {
  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>

      <SkeletonCard className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-slate-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="px-6 py-3 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </SkeletonCard>
    </main>
  );
}
