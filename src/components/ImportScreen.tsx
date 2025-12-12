import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, ask } from "@tauri-apps/plugin-dialog";
import { CsvMetadata, SensorMetadata } from "../types";
import { FileText, Play, FileSpreadsheet, ArrowRight } from "lucide-react";

interface ImportScreenProps {
    onDataReady: (data: CsvMetadata, sensorMetadata: SensorMetadata[] | null) => void;
}

export default function ImportScreen({ onDataReady }: ImportScreenProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataFilePath, setDataFilePath] = useState<string | null>(null);
    const [metadataFilePath, setMetadataFilePath] = useState<string | null>(null);

    const handleSelectDataFile = async () => {
        if (loading) return;
        try {
            const selected = await openDialog({
                multiple: false,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            if (selected && typeof selected === 'string') {
                setDataFilePath(selected);
                setError(null);
            }
        } catch (err) {
            setError(String(err));
        }
    };

    const handleSelectMetadataFile = async () => {
        if (loading) return;
        try {
            const selected = await openDialog({
                multiple: false,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            if (selected && typeof selected === 'string') {
                setMetadataFilePath(selected);
                setError(null);
            }
        } catch (err) {
            setError(String(err));
        }
    };

    const handleAnalyze = async () => {
        if (!dataFilePath) return;
        setLoading(true);
        setError(null);
        try {
            console.time("invoke_load_csv");
            const dataMetadata = await invoke<CsvMetadata>("load_csv", { path: dataFilePath });
            console.timeEnd("invoke_load_csv");

            let sensorMetadata: SensorMetadata[] | null = null;
            if (metadataFilePath) {
                console.time("invoke_load_metadata");
                sensorMetadata = await invoke<SensorMetadata[]>("load_metadata_command", { path: metadataFilePath });
                console.timeEnd("invoke_load_metadata");

                // Validation: Check consistency between Data and Metadata
                if (sensorMetadata && dataMetadata) {
                    const dataHeaders = dataMetadata.headers.filter(h => !['time', 'timestamp'].includes(h.toLowerCase()));
                    const metaTags = new Set(sensorMetadata.map(m => m.tag.toLowerCase()));

                    const missingInMeta = dataHeaders.filter(h => !metaTags.has(h.toLowerCase()));
                    const headerSet = new Set(dataHeaders.map(h => h.toLowerCase()));
                    const missingInData = sensorMetadata.filter(m => !headerSet.has(m.tag.toLowerCase())).map(m => m.tag);

                    if (missingInMeta.length > 0 || missingInData.length > 0) {
                        let msg = "Validation Warning:\n";
                        if (missingInMeta.length > 0) {
                            msg += `\nSensors in Data but missing in Metadata (${missingInMeta.length}):\n${missingInMeta.slice(0, 5).join(", ")}${missingInMeta.length > 5 ? "..." : ""}`;
                        }
                        if (missingInData.length > 0) {
                            msg += `\n\nSensors in Metadata but missing in Data (${missingInData.length}):\n${missingInData.slice(0, 5).join(", ")}${missingInData.length > 5 ? "..." : ""}`;
                        }
                        msg += "\n\nDo you want to proceed?";

                        const confirmed = await ask(msg, {
                            title: 'Data Validation Warning',
                            kind: 'warning'
                        });

                        if (!confirmed) {
                            setLoading(false);
                            return;
                        }
                    }
                }
            }

            onDataReady(dataMetadata, sensorMetadata);
        } catch (err) {
            setError(String(err));
            setLoading(false);
        }
    };

    return (
        <div className="import-container">
            <div className="import-card">
                <h1>Import Data</h1>
                <p>Select your sensor data CSV and optional metadata to begin analysis.</p>

                <div className="selection-area">
                    {/* Data File Selection */}
                    <div
                        className={`file-selection-card ${dataFilePath ? 'active' : ''} ${loading ? 'disabled' : ''}`}
                        onClick={handleSelectDataFile}
                    >
                        <div className="icon-wrapper">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div className="selection-text">
                            <span className="selection-title">Select Sensor Data CSV <span style={{ opacity: 0.6, fontSize: '0.8em', fontWeight: 'normal' }}>(Required)</span></span>
                            <span className="selection-subtitle">
                                {dataFilePath ? dataFilePath.split(/[/\\]/).pop() : "Drag & drop or click to browse"}
                            </span>
                        </div>
                    </div>

                    {/* Metadata File Selection */}
                    <div
                        className={`file-selection-card ${metadataFilePath ? 'active' : ''} ${loading ? 'disabled' : ''}`}
                        onClick={handleSelectMetadataFile}
                        style={{ borderColor: metadataFilePath ? undefined : '#334155', background: metadataFilePath ? undefined : 'rgba(30, 41, 59, 0.3)' }}
                    >
                        <div className="icon-wrapper" style={{ background: metadataFilePath ? undefined : 'rgba(51, 65, 85, 0.5)' }}>
                            <FileText size={24} />
                        </div>
                        <div className="selection-text">
                            <span className="selection-title">Select Metadata CSV <span style={{ opacity: 0.6, fontSize: '0.8em', fontWeight: 'normal' }}>(Optional)</span></span>
                            <span className="selection-subtitle">
                                {metadataFilePath ? metadataFilePath.split(/[/\\]/).pop() : "Drag & drop or click to browse"}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <button
                        onClick={handleAnalyze}
                        disabled={!dataFilePath || loading}
                        className="analyze-btn"
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                <span>Analyze Data</span>
                                <ArrowRight size={20} style={{ marginLeft: 'auto' }} />
                            </>
                        )}
                    </button>
                </div>

                {error && <p className="error" style={{ marginTop: '1rem', color: '#ef4444' }}>{error}</p>}
            </div>
        </div>
    );
}
