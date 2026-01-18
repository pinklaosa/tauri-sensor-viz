import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, ask } from "@tauri-apps/plugin-dialog";
import { CsvMetadata, SensorMetadata } from "../types";
import { FileText, ArrowRight, X, Upload, File } from "lucide-react";

interface ImportScreenProps {
    onDataReady: (data: CsvMetadata, sensorMetadata: SensorMetadata[] | null) => void;
}

export default function ImportScreen({ onDataReady }: ImportScreenProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataFilePaths, setDataFilePaths] = useState<string[]>([]);
    const [metadataFilePath, setMetadataFilePath] = useState<string | null>(null);

    const handleRemoveFile = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newPaths = [...dataFilePaths];
        newPaths.splice(index, 1);
        setDataFilePaths(newPaths);
    };

    const handleSelectDataFile = async () => {
        if (loading) return;
        try {
            const selected = await openDialog({
                multiple: true,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });
            if (selected) {
                let newFiles: string[] = [];
                if (Array.isArray(selected)) {
                    newFiles = selected;
                } else if (typeof selected === 'string') {
                    newFiles = [selected];
                }

                // Filter out duplicates
                setDataFilePaths(prev => {
                    const uniqueNew = newFiles.filter(f => !prev.includes(f));
                    return [...prev, ...uniqueNew];
                });
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
        if (dataFilePaths.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            console.time("invoke_load_csv");
            const dataMetadata = await invoke<CsvMetadata>("load_csv", { paths: dataFilePaths });
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

    // Inline styles for the specific glowing look
    const containerStyle: React.CSSProperties = {
        background: '#0f172a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
    };

    const headerStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '800px',
        marginBottom: '1rem',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textAlign: 'left'
    };

    const sectionBoxStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '800px',
        background: 'rgba(30, 41, 59, 0.4)',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '1rem',
        fontWeight: 600,
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        color: '#e2e8f0'
    };

    const dropZoneStyle: React.CSSProperties = {
        border: '2px dashed #475569',
        borderRadius: '12px',
        height: '160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(30, 41, 59, 0.3)',
        cursor: loading ? 'default' : 'pointer',
        marginBottom: '1rem',
        transition: 'all 0.2s ease'
    };

    const metadataDropZoneStyle: React.CSSProperties = {
        ...dropZoneStyle,
        height: '60px',
        flexDirection: 'row',
        gap: '1rem',
        marginBottom: 0
    };

    const iconGlowStyle: React.CSSProperties = {
        color: '#94a3b8',
        marginBottom: '10px'
    };

    const fileListStyle: React.CSSProperties = {
        display: 'flex',
        overflowX: 'auto',
        gap: '1rem',
        padding: '0.5rem 0',
        scrollbarWidth: 'thin'
    };

    const fileCardStyle: React.CSSProperties = {
        background: 'rgba(51, 65, 85, 0.6)',
        borderRadius: '8px',
        padding: '0.75rem',
        minWidth: '220px',
        maxWidth: '220px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(148, 163, 184, 0.2)'
    };

    const buttonStyle: React.CSSProperties = {
        background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
        border: 'none',
        padding: '0.75rem 2rem',
        borderRadius: '2rem',
        color: 'white',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginLeft: 'auto',
        marginTop: '1rem'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>Import Data</div>

            {/* 1. Raw Data Section */}
            <div style={sectionBoxStyle}>
                <div style={sectionTitleStyle}>1. Raw Data (Multiple files)</div>
                <div
                    style={dropZoneStyle}
                    onClick={handleSelectDataFile}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.currentTarget.style.borderColor = '#475569';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.3)';
                        }
                    }}
                >
                    <div style={iconGlowStyle}>
                        <FileText size={48} strokeWidth={1.5} />
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Drag & drop or click to browse drop a file
                    </span>
                </div>

                {dataFilePaths.length > 0 && (
                    <div style={fileListStyle} className="custom-scrollbar">
                        {dataFilePaths.map((path, index) => (
                            <div key={index} style={fileCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                    <File size={24} color="#94a3b8" />
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <span style={{
                                            fontSize: '0.8rem', color: '#e2e8f0',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }} title={path.split(/[/\\]/).pop()}>
                                            {path.split(/[/\\]/).pop()}
                                        </span>
                                        {/* <span style={{ fontSize: '0.7rem', color: '#64748b' }}>120 MB</span> Placeholder size */}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleRemoveFile(index, e)}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Metadata Section */}
            <div style={sectionBoxStyle}>
                <div style={sectionTitleStyle}>2. Metadata (Single file)</div>
                <div
                    style={metadataDropZoneStyle}
                    onClick={handleSelectMetadataFile}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.currentTarget.style.borderColor = '#475569';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.3)';
                        }
                    }}
                >
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', flex: 1, textAlign: 'center' }}>
                        {metadataFilePath
                            ? `Selected: ${metadataFilePath.split(/[/\\]/).pop()}`
                            : "Drag & drop or click to browse for metadata file"}
                    </span>
                    <div style={{ marginRight: '1rem' }}>
                        <Upload size={20} color="#94a3b8" />
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    style={{
                        ...buttonStyle,
                        opacity: (dataFilePaths.length === 0 || loading) ? 0.5 : 1,
                        cursor: (dataFilePaths.length === 0 || loading) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={handleAnalyze}
                    disabled={dataFilePaths.length === 0 || loading}
                    onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) e.currentTarget.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) e.currentTarget.style.filter = 'none';
                    }}
                >
                    {loading ? 'Processing...' : 'Analyze Data'}
                    {!loading && <ArrowRight size={20} />}
                </button>
            </div>

            {error && <div style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</div>}
        </div>
    );
}
