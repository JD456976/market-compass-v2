import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import App from "./App.tsx";
import { SplashScreen } from "./components/SplashScreen.tsx";
import "./index.css";

// Market Compass is dark-only — ensure the dark class is always present
// regardless of OS preference or any other theme logic
document.documentElement.classList.add('dark');

function Root() {
  const [splashDone, setSplashDone] = useState(() => {
    // Only show splash once per browser session
    if (sessionStorage.getItem('mc_splash_shown')) return true;
    return false;
  });

  const handleSplashFinished = useCallback(() => {
    sessionStorage.setItem('mc_splash_shown', 'true');
    setSplashDone(true);
  }, []);

  return (
    <>
      {!splashDone && <SplashScreen onFinished={handleSplashFinished} />}
      {splashDone && <App />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
