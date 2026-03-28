import { useCallback, useEffect, useState } from "react";
import CareerMap from "./CareerMap/CareerMap";
import BurnoutMeter from "./BurnoutMeter";
import BurnoutCheckin from "./BurnoutCheckin";
import type { BurnoutZone } from "./CareerMap/burnout";
import type { CareerMapPayload } from "../types/careerMap";

type DashboardProps = {
  userId: string;
  onLogout: () => void;
};

export default function Dashboard({ userId, onLogout }: DashboardProps) {
  const [payload, setPayload] = useState<CareerMapPayload | null>(null);
  const [burnout, setBurnout] = useState({ score: 0, zone: "healthy" as BurnoutZone });
  const [showCheckin, setShowCheckin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapSource, setMapSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCareerMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${base}/api/career-map/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPayload({ nodes: data.nodes, edges: data.edges });
      if (data.burnout) setBurnout(data.burnout);
      setMapSource(data.source || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load career map");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadCareerMap();
  }, [loadCareerMap]);

  const handleCheckinComplete = (result: { score: number; zone: string }) => {
    setBurnout({ score: result.score, zone: result.zone as BurnoutZone });
    setShowCheckin(false);
    void loadCareerMap();
  };

  const zoneMessage = {
    risk: "High-stress paths are dimmed. Focus on manageable, short-term actions.",
    early_warning: "Some high-effort paths are de-prioritized to help you pace yourself.",
    healthy: "All paths are available. Explore freely.",
  }[burnout.zone];

  return (
    <div className="flex min-h-full flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              CareerPulse
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheckin(true)}
              className="btn-secondary flex items-center gap-2 !px-4 !py-2 text-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              Weekly Check-in
            </button>
            <button
              onClick={() => void loadCareerMap()}
              className="btn-secondary !px-3 !py-2 text-xs"
              title="Regenerate map"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onLogout} className="rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-slate-300">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Top row */}
        <div className="grid gap-6 md:grid-cols-3 animate-fade-up">
          <div className="md:col-span-2">
            <BurnoutMeter score={burnout.score} zone={burnout.zone} />
          </div>
          <div className="glass-card flex flex-col justify-center p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick Actions</h3>
            <div className="space-y-2">
              <ActionButton
                icon={<ClipboardIcon />}
                title="Take Check-in"
                sub="Update your burnout score"
                onClick={() => setShowCheckin(true)}
              />
              <ActionButton
                icon={<RefreshIcon />}
                title="Refresh Map"
                sub="Generate new AI paths"
                onClick={() => void loadCareerMap()}
              />
            </div>
          </div>
        </div>

        {/* Career Map */}
        <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Your Career Roadmap</h2>
              <p className="text-xs text-slate-500">
                {zoneMessage}
                {mapSource && (
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    {mapSource === "gemini" ? "AI Generated" : "Sample Map"}
                  </span>
                )}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
              {error} — ensure the backend is running.
            </div>
          )}

          {loading ? (
            <div className="glass-card flex h-[500px] items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Generating your career map...</p>
              </div>
            </div>
          ) : payload ? (
            <CareerMap nodes={payload.nodes} edges={payload.edges} burnoutZone={burnout.zone} />
          ) : null}
        </div>

        {/* Tips */}
        <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="glass-card p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {burnout.zone === "risk" ? "Self-Care Tips" : "Pro Tips"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {burnout.zone === "risk" ? (
                <>
                  <TipCard title="Take a Break" text="Step away for 15 minutes. A short walk resets your focus." />
                  <TipCard title="Smallest Step" text="Pick one item from the highlighted nodes. That's today's win." />
                  <TipCard title="Talk to Someone" text="Reach out to a friend, mentor, or counselor today." />
                </>
              ) : (
                <>
                  <TipCard title="Set Milestones" text="Break big goals into 2-week sprints for steady progress." />
                  <TipCard title="Track Progress" text="Check in weekly to keep your burnout score low." />
                  <TipCard title="Explore Broadly" text="Try paths outside your comfort zone while energy is high." />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 py-4 text-center text-xs text-slate-600">
        Powered by Google Gemini &middot; Modal &middot; Supabase
      </footer>

      {showCheckin && (
        <BurnoutCheckin userId={userId} onComplete={handleCheckinComplete} onClose={() => setShowCheckin(false)} />
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function ActionButton({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-slate-800/40 px-4 py-3 text-left text-sm text-slate-300 transition-all hover:bg-slate-700/40 hover:text-white"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700/50 text-slate-300">
        {icon}
      </span>
      <div>
        <span className="font-medium">{title}</span>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
    </button>
  );
}

function TipCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-slate-800/30 p-4 transition-all hover:bg-slate-800/50">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
