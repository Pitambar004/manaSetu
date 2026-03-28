import { useCallback, useEffect, useState } from "react";
import CareerMap from "./components/CareerMap/CareerMap";
import type { BurnoutZone } from "./components/CareerMap/burnout";
import type { CareerMapPayload } from "./types/careerMap";

const BURNOUT_ZONES: BurnoutZone[] = ["healthy", "early_warning", "risk"];

function App() {
  const [payload, setPayload] = useState<CareerMapPayload | null>(null);
  const [zone, setZone] = useState<BurnoutZone>("healthy");
  const [error, setError] = useState<string | null>(null);

  const loadSample = useCallback(async () => {
    setError(null);
    try {
      // Uses Vite proxy to FastAPI in dev; point to Modal URL in prod via env
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${base}/api/career-map/sample`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CareerMapPayload;
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map");
    }
  }, []);

  useEffect(() => {
    void loadSample();
  }, [loadSample]);

  return (
    <div className="flex min-h-full flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">ManaSetu</h1>
          <p className="text-sm text-slate-400">
            Career map from the API — toggle burnout zone to preview adaptive UI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-slate-500">Burnout zone</label>
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={zone}
            onChange={(e) => setZone(e.target.value as BurnoutZone)}
          >
            {BURNOUT_ZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadSample()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Reload map
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {error} — start the backend:{" "}
          <code className="rounded bg-slate-800 px-1">cd backend && uvicorn main:api --reload</code>
        </p>
      )}

      <main className="flex flex-1 flex-col">
        {payload ? (
          <CareerMap nodes={payload.nodes} edges={payload.edges} burnoutZone={zone} />
        ) : (
          !error && <p className="text-slate-500">Loading career map…</p>
        )}
      </main>
    </div>
  );
}

export default App;
