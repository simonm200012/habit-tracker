import { INSIGHT_CLASSES, type Insight } from "@/lib/insights";

export function InsightCard({ insight }: { insight: Insight }) {
  const c = INSIGHT_CLASSES[insight.tone];
  const body = (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl ring-1 ${c.bg} ${c.ring} transition hover:shadow-sm`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${c.iconBg}`}>
        {insight.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold tracking-tight text-slate-900 text-sm">{insight.title}</h4>
        <p className="text-xs text-slate-600 mt-0.5 leading-snug">{insight.body}</p>
      </div>
    </div>
  );

  if (insight.habitId) {
    return (
      <a href={`/habits/${insight.habitId}`} className="block">
        {body}
      </a>
    );
  }
  return body;
}
