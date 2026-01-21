import { useState, useEffect } from "react";
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
