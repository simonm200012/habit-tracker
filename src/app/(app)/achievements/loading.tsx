import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function AchievementsLoading() {
  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-7" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-11 h-11" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
