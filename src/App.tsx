import { useState } from "react";
import ImportScreen from "./components/ImportScreen";
import Dashboard from "./components/Dashboard";
import { CsvMetadata, SensorMetadata } from "./types";
import "./App.css";

function App() {
  const [metadata, setMetadata] = useState<CsvMetadata | null>(null);
  const [sensorMetadata, setSensorMetadata] = useState<SensorMetadata[] | null>(null);

  return (
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
  );
}

export default App;
