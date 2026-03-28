import { useState } from "react";

type OnboardingProps = {
  onComplete: (userId: string) => void;
};

const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "React", "Java", "C++", "SQL", "Machine Learning",
  "Data Analysis", "UI/UX Design", "Project Management", "Public Speaking",
  "Technical Writing", "Cloud Computing", "DevOps", "Mobile Development",
];

const INTEREST_SUGGESTIONS = [
  "Software Engineering", "Data Science", "Product Management", "UX Research",
  "AI/ML Engineering", "Cybersecurity", "Cloud Architecture", "Game Development",
  "Startup Founder", "Consulting", "Research / Academia", "Finance / Fintech",
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [major, setMajor] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [customInterest, setCustomInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const addCustom = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setClear: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setClear("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${base}/api/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major, skills, interests }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onComplete(data.user_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setLoading(false);
    }
  };

  const canProceed = [major.trim().length > 0, skills.length >= 1, interests.length >= 1];

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              CareerPulse
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Navigate your future without burning out</p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex gap-2 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? "bg-gradient-to-r from-indigo-500 to-cyan-400" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="glass-card gradient-border p-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
          {/* Step 0: Major */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">What's your major?</h2>
                <p className="mt-1 text-sm text-slate-400">Tell us what you're studying or your field of work.</p>
              </div>
              <input
                id="onboard-major"
                className="input-field"
                placeholder="e.g. Computer Science, Business, Psychology..."
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canProceed[0] && setStep(1)}
                autoFocus
              />
              <button className="btn-primary w-full" disabled={!canProceed[0]} onClick={() => setStep(1)}>
                Continue
              </button>
            </div>
          )}

          {/* Step 1: Skills */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Your skills</h2>
                <p className="mt-1 text-sm text-slate-400">Select or add skills you have. Pick at least one.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleItem(skills, setSkills, s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      skills.includes(s)
                        ? "bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/50"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom(customSkill, skills, setSkills, setCustomSkill)}
                />
                <button className="btn-secondary" onClick={() => addCustom(customSkill, skills, setSkills, setCustomSkill)}>
                  Add
                </button>
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary flex-1" disabled={!canProceed[1]} onClick={() => setStep(2)}>Continue</button>
              </div>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Career interests</h2>
                <p className="mt-1 text-sm text-slate-400">What career directions excite you? Pick at least one.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTEREST_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleItem(interests, setInterests, s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      interests.includes(s)
                        ? "bg-cyan-500/25 text-cyan-300 ring-1 ring-cyan-400/50"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Add custom interest..."
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom(customInterest, interests, setInterests, setCustomInterest)}
                />
                <button className="btn-secondary" onClick={() => addCustom(customInterest, interests, setInterests, setCustomInterest)}>
                  Add
                </button>
              </div>
              {error && (
                <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">{error}</p>
              )}
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary flex-1" disabled={!canProceed[2] || loading} onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Creating your map...
                    </span>
                  ) : (
                    "Launch CareerPulse"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-600 animate-fade-in" style={{ animationDelay: "300ms" }}>
          Powered by Google Gemini AI &middot; Modal &middot; Supabase
        </p>
      </div>
    </div>
  );
}
