import { useState } from "react";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";

type AppView = "onboarding" | "dashboard";

function App() {
  const [view, setView] = useState<AppView>("onboarding");
  const [userId, setUserId] = useState<string | null>(null);

  const handleOnboardComplete = (id: string) => {
    setUserId(id);
    setView("dashboard");
  };

  const handleLogout = () => {
    setUserId(null);
    setView("onboarding");
  };

  return (
    <>
      {view === "onboarding" && <Onboarding onComplete={handleOnboardComplete} />}
      {view === "dashboard" && userId && (
        <Dashboard userId={userId} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
