export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
      style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
    />
  );
}

export function SkeletonCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 ${className}`}>
      {children}
    </div>
  );
}
