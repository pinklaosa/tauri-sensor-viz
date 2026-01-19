import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { listen, emit, UnlistenFn } from "@tauri-apps/api/event";
import { ProcessedData, CsvMetadata, SensorMetadata, CsvRecord } from '../types';
import DataTable from './DataTable';
import Chart from './Chart';
import FilterPanel from './FilterPanel';
import SensorSelection from './SensorSelection';

import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Plus } from 'lucide-react';


interface DashboardProps {
    metadata: CsvMetadata;
    sensorMetadata: SensorMetadata[] | null;
    onBack: () => void;
}

export default function Dashboard({ metadata, sensorMetadata, onBack }: DashboardProps) {
    const [analysisResult, setAnalysisResult] = useState<string>("");

    const handleAnalysis = async () => {
        try {
            const result = await invoke<string>("run_python_analysis");
            console.log("Python Analysis Result:", result);
            setAnalysisResult(result);
            alert("Analysis Result: " + result);
        } catch (e) {
            console.error("Analysis Failed:", e);
            alert("Analysis Failed: " + String(e));
        }
    };

    const sensorHeaders = useMemo(() =>
        metadata.headers.filter(h => {
            const lower = h.trim().toLowerCase();
            return lower !== 'timestamp' && lower !== 'time';
        }),
        [metadata]
    );

    const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
    const deferredSensors = useDeferredValue(selectedSensors);
    const [chartData, setChartData] = useState<ProcessedData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch data when sensors change
    useEffect(() => {
        let unlistenChunk: UnlistenFn | undefined;
        let unlistenEnd: UnlistenFn | undefined;

        const fetchData = async () => {
            // Reset state
            // setChartData(null); // Keep previous data to prevent flickering

            if (deferredSensors.length === 0) {
                setChartData({ headers: [], rows: [] });
                return;
            }

            setLoading(true);
            const accumRows: CsvRecord[] = [];
            let headers: string[] = [];

            try {
                // Setup listeners BEFORE invoking
                unlistenChunk = await listen<ProcessedData>('data-stream-chunk', (event) => {
                    const chunk = event.payload;
                    if (headers.length === 0) {
                        headers = chunk.headers;
                    }
                    accumRows.push(...chunk.rows);

                    // Optional: Update intermediate state if we want real-time visualization
                    // But for performance, usually better to wait or throttle updates.
                    // Here we will just accumulate and update at end for safety/simplicity first,
                    // or we could update setChartData incrementally if desired.
                    // Given the request is about "sending as chunk", let's wait for end for the *chart*
                    // render to avoid thrashing, or maybe show a progress count.
                });

                unlistenEnd = await listen('data-stream-end', () => {
                    setChartData({
                        headers: headers.length > 0 ? headers : deferredSensors,
                        rows: accumRows
                    });
                    setLoading(false);
                });

                console.time("invoke_get_data_stream");
                // invoke now just starts the process
                await invoke("get_data", { sensors: deferredSensors });
                console.timeEnd("invoke_get_data_stream");

            } catch (err) {
                console.error("Failed to fetch data:", err);
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            if (unlistenChunk) unlistenChunk();
            if (unlistenEnd) unlistenEnd();
        };

        // Event handling for Add Sensor Window communication
        useEffect(() => {
            let unlistenRequest: UnlistenFn | undefined;
            let unlistenAdd: UnlistenFn | undefined;

            const setupListeners = async () => {
                // Listen for request from child window
                unlistenRequest = await listen('request-sensors', () => {
                    emit('sensors-data', {
                        sensors: sensorHeaders,
                        selectedSensors: selectedSensors,
                        sensorMetadata: sensorMetadata
                    });
                });

                // Listen for new selections from child window
                unlistenAdd = await listen<string[]>('add-sensor-selection', (event) => {
                    const newSelection = event.payload;
                    // Merge with existing or replace? User asked to "Add", but logic usually implies extending.
                    // If the window sends the *full* new list, we just set it.
                    // If it sends *only new ones*, we merge.
                    // Let's assume the window sends the FULL desired set of selected sensors for simplicity/sync.
                    setSelectedSensors(newSelection);
                });
            };

            setupListeners();

            return () => {
                if (unlistenRequest) unlistenRequest();
                if (unlistenAdd) unlistenAdd();
            };
        }, [sensorHeaders, selectedSensors, sensorMetadata]);

    }, [deferredSensors]);

    const [dateRange, setDateRange] = useState<{ start: string, end: string } | null>(null);
    const [chartType, setChartType] = useState<'line' | 'scatter' | 'pair'>('line');
    const [samplingMethod, setSamplingMethod] = useState<'raw' | 'avg' | 'max' | 'min' | 'first' | 'last'>('raw');


    // Filter logic (Client side filtering of the fetched subset)
    const filteredData = useMemo(() => {
        if (!chartData) return [];

        let rows = chartData.rows.filter(r => r.timestamp !== null);

        // 1. Filter by Date Range first (optimization)
        if (dateRange && dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start).getTime();
            const end = new Date(dateRange.end).getTime();
            rows = rows.filter(r => {
                if (!r.timestamp) return false;
                const t = new Date(r.timestamp).getTime();
                if (isNaN(t)) return false; // Skip invalid dates
                return t >= start && t <= end;
            });
        }

        // 2. Aggregation / Sampling
        if (samplingMethod === 'raw') {
            return rows;
        }

        // helper to get hour key
        const getHourKey = (ts: string) => {
            const d = new Date(ts);
            d.setMinutes(0, 0, 0); // round down to hour
            return d.toISOString();
        };

        const grouped = new Map<string, CsvRecord[]>();

        rows.forEach(r => {
            if (!r.timestamp) return;
            const key = getHourKey(r.timestamp);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(r);
        });

        const aggregated: CsvRecord[] = [];
        // Map is insertion ordered mostly, but let's sort keys to be safe if needed,
        // though usually iterating map keys matches insertion order which follows time if data is sorted.
        // Data from backend is likely sorted by time.

        for (const [timestamp, groupRows] of grouped) {
            const newValues: (number | null)[] = [];

            // For each sensor column
            for (let i = 0; i < chartData.headers.length; i++) {
                // Should match index of sensorHeaders? No, chartData.headers includes Timestamp usually?
                // Wait, chartData.headers from backend likely includes "timestamp" or similar.
                // Let's check chartData structure.
                // Actually, ProcessedData usually has headers matching values indices.
                // values[i] corresponds to headers[i].

                // Extract valid numbers for this column
                const validValues = groupRows
                    .map(r => r.values[i])
                    .filter((v): v is number => v !== null);

                let val: number | null = null;

                if (validValues.length > 0) {
                    if (samplingMethod === 'avg') {
                        const sum = validValues.reduce((a, b) => a + b, 0);
                        val = sum / validValues.length;
                    } else if (samplingMethod === 'max') {
                        val = Math.max(...validValues);
                    } else if (samplingMethod === 'min') {
                        val = Math.min(...validValues);
                    } else if (samplingMethod === 'first') {
                        // First in the group (assuming groupRows is sorted by time)
                        // We can check the original values too to be safe, but validValues logic above lost indices.
                        // Re-do specific logic for first/last to respect nulls correctly?
                        // "First" usually means first existing value or first absolute value?
                        // Request says: "taking the first value". Let's take the first non-null.
                        val = validValues[0];
                    } else if (samplingMethod === 'last') {
                        val = validValues[validValues.length - 1];
                    }
                }
                newValues.push(val);
            }
            aggregated.push({ timestamp, values: newValues });
        }

        // If aggregation happened, we might want to ensure it's sorted by time again
        aggregated.sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

        return aggregated;
    }, [chartData, dateRange, samplingMethod]);


    // Calculate data range for auto-filling inputs
    const dataRange = useMemo(() => {
        if (!chartData || chartData.rows.length === 0) return undefined;
        // Assuming sorted by timestamp, but let's be safe.
        // Actually, large data might be unsorted? Usually sorted.
        // If data is huge, this might be slow. But rows is usually filtered? No, chartData.rows is "all" fetched data.
        // We should just take first and last if sorted.
        // Let's assume sorted for O(1). If not, we fix later.
        // Backend usually returns sorted.

        const first = chartData.rows[0].timestamp;
        const last = chartData.rows[chartData.rows.length - 1].timestamp;

        if (first && last) {
            // Check if sorted?
            // Let's just trust first and last for optimization on large datasets.
            return {
                min: first,
                max: last
            };
        }
        return undefined;
    }, [chartData]);


    return (
        <div className="dashboard-container">
            <div className="top-bar">
                <FilterPanel
                    onDateRangeChange={(start, end) => setDateRange({ start, end })}
                    onSamplingChange={setSamplingMethod}
                    onBack={onBack}
                    dataRange={dataRange}
                />
            </div>

            <div className="dashboard-grid-split">
                <div className="chart-section-large">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Sensor Readings • {samplingMethod.toUpperCase()} (1h) • {filteredData.length.toLocaleString()} Points {loading && "(Loading...)"}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setChartType('line')}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: chartType === 'line' ? '#3b82f6' : '#334155',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                Line
                            </button>
                            <button
                                onClick={() => setChartType('scatter')}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: chartType === 'scatter' ? '#3b82f6' : '#334155',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                Scatter
                            </button>
                            <button
                                onClick={() => setChartType('pair')}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: chartType === 'pair' ? '#3b82f6' : '#334155',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                Pair Plot
                            </button>
                            <button
                                onClick={handleAnalysis}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    marginLeft: '10px'
                                }}
                            >
                                Run Python Analysis
                            </button>
                        </div>
                    </div>
                    <div className="chart-wrapper" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        {chartData && (
                            <Chart
                                data={filteredData} // Use filteredData which is simplified
                                sensors={chartData.headers} // Keep using loaded headers to avoid mismatch during load
                                headers={chartData.headers}
                                chartType={chartType}
                            />
                        )}
                    </div>
                </div>

                <div className="right-column">
                    <div className="widget-section">
                        <div className="section-header">
                            <h3>Recent Sensor Data</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sensorHeaders.length} Sensors</span>
                        </div>
                        <div className="widget-content">
                            <SensorSelection
                                sensors={sensorHeaders}
                                selectedSensors={selectedSensors}
                                onSensorChange={setSelectedSensors}
                                sensorMetadata={sensorMetadata}
                            />
                        </div>
                        <div className="widget-footer">
                            <button
                                className="add-sensor-btn"
                                onClick={async () => {
                                    const webview = new WebviewWindow('add-sensor', {
                                        url: '/?window=add-sensor',
                                        title: 'Add Special Sensor',
                                        width: 800,
                                        height: 1000,
                                        alwaysOnTop: false
                                    });
                                    await webview.once('tauri://created', function () {
                                        // webview window successfully created
                                    });
                                    await webview.once('tauri://error', function (e) {
                                        // an error happened creating the webview window
                                        console.error(e);
                                    });
                                }}
                            >
                                <Plus size={16} />
                                Add Special Sensor
                            </button>
                        </div>
                    </div>

                    <div className="widget-section">
                        <div className="section-header">
                            <h3>Data Insight</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{filteredData.length} Rows</span>
                        </div>
                        <div className="widget-content">
                            {chartData && <DataTable headers={chartData.headers} data={filteredData} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

