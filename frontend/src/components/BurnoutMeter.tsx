import type { BurnoutZone } from "./CareerMap/burnout";

type BurnoutMeterProps = {
  score: number;
  zone: BurnoutZone;
};

const ZONE_CONFIG = {
  healthy: {
    label: "Healthy",
    color: "text-emerald-400",
    gradient: "from-emerald-500 to-emerald-400",
    message: "You're in a great headspace. All career paths are open to you.",
    ringStroke: "#22c55e",
    ringStrokeEnd: "#34d399",
  },
  early_warning: {
    label: "Early Warning",
    color: "text-amber-400",
    gradient: "from-amber-500 to-yellow-400",
    message: "Some stress detected. Consider pacing your goals this week.",
    ringStroke: "#f59e0b",
    ringStrokeEnd: "#fbbf24",
  },
  risk: {
    label: "Burnout Risk",
    color: "text-red-400",
    gradient: "from-red-500 to-rose-400",
    message: "High stress detected. We've simplified your roadmap to focus on small wins.",
    ringStroke: "#ef4444",
    ringStrokeEnd: "#f87171",
  },
};

export default function BurnoutMeter({ score, zone }: BurnoutMeterProps) {
  const config = ZONE_CONFIG[zone];
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Burnout Meter</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
              style={{ borderColor: "currentColor", background: "rgba(0,0,0,0.2)" }}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="rotate-[-90deg]">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={`url(#gauge-grad-${zone})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id={`gauge-grad-${zone}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={config.ringStroke} />
                <stop offset="100%" stopColor={config.ringStrokeEnd} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${config.color}`}>{score}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm leading-relaxed text-slate-300">{config.message}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-1000 ease-out`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
