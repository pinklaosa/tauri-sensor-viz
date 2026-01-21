import { useState, useEffect } from "react";
import { Window } from "@tauri-apps/api/window";
import ImportScreen from "./components/ImportScreen";
import Dashboard from "./components/Dashboard";
import { CsvMetadata, SensorMetadata } from "./types";

import TitleBar from "./components/TitleBar";

function App() {
  const [metadata, setMetadata] = useState<CsvMetadata | null>(null);
  const [sensorMetadata, setSensorMetadata] = useState<SensorMetadata[] | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Splash Screen
  useEffect(() => {
    const initSplash = async () => {
      // Add a small delay for the splash screen to be visible
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const splash = await Window.getByLabel("splashscreen");
        if (splash) {
          await splash.close();
        }

        const main = await Window.getByLabel("main");
        if (main) {
          await main.show();
          await main.setFocus();
        }
      } catch (error) {
        console.warn("Could not manage windows (not in Tauri?)", error);
      }
    };

    initSplash();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <TitleBar theme={theme} toggleTheme={toggleTheme} />
      <main className="app-container">
        {!metadata ? (
          <ImportScreen onDataReady={(csv, sensor) => {
            setMetadata(csv);
            setSensorMetadata(sensor);
          }} />
        ) : (
          <Dashboard
            metadata={metadata}
            sensorMetadata={sensorMetadata}
            onBack={() => {
              setMetadata(null);
              setSensorMetadata(null);
            }}
          />
        )}
      </main>
    </>
  );
}

export default App;
