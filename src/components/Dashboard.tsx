import { useState, useMemo, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { ProcessedData, CsvMetadata, SensorMetadata } from '../types';
import DataTable from './DataTable';
import Chart from './Chart';
import FilterPanel from './FilterPanel';
import SensorSelection from './SensorSelection';

interface DashboardProps {
    metadata: CsvMetadata;
    sensorMetadata: SensorMetadata[] | null;
    onBack: () => void;
}

export default function Dashboard({ metadata, sensorMetadata, onBack }: DashboardProps) {
    const sensorHeaders = useMemo(() =>
        metadata.headers.filter(h => {
            const lower = h.trim().toLowerCase();
            return lower !== 'timestamp' && lower !== 'time';
        }),
        [metadata]
    );

    const [selectedSensors, setSelectedSensors] = useState<string[]>(() => {
        // Default to first 3 sensors if available
        return sensorHeaders.slice(0, 3);
    });
    const [chartData, setChartData] = useState<ProcessedData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch data when sensors change
    useEffect(() => {
        const fetchData = async () => {
            if (selectedSensors.length === 0) {
                setChartData({ headers: [], rows: [] });
                return;
            }

            setLoading(true);
            try {
                console.time("invoke_get_data");
                const data = await invoke<ProcessedData>("get_data", { sensors: selectedSensors });
                console.timeEnd("invoke_get_data");
                setChartData(data);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedSensors]);

    const [dateRange, setDateRange] = useState<{ start: string, end: string } | null>(null);
    const [chartType, setChartType] = useState<'line' | 'scatter'>('line');

    // Filter logic (Client side filtering of the fetched subset)
    const filteredData = useMemo(() => {
        if (!chartData) return [];
        let res = chartData.rows.filter(r => r.timestamp !== null);

        if (dateRange && dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start).getTime();
            const end = new Date(dateRange.end).getTime();
            res = res.filter(r => {
                if (!r.timestamp) return false;
                const t = new Date(r.timestamp).getTime();
                return t >= start && t <= end;
            });
        }

        return res;
    }, [chartData, dateRange]);



    return (
        <div className="dashboard-container">
            <div className="top-bar">
                <FilterPanel
                    onDateRangeChange={(start, end) => setDateRange({ start, end })}
                    onBack={onBack}
                />
            </div>

            <div className="dashboard-grid-split">
                <div className="chart-section-large">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Sensor Readings • Last 24 Hours • {filteredData.length.toLocaleString()} Points {loading && "(Loading...)"}</h3>
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
                        </div>
                    </div>
                    <div className="chart-wrapper">
                        {chartData && (
                            <Chart
                                data={filteredData} // Use filteredData which is simplified
                                sensors={selectedSensors}
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
                    </div>

                    <div className="widget-section">
                        <div className="section-header">
                            <h3>Data Insight</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{filteredData.length} Rows</span>
                        </div>
                        <div className="widget-content table-wrapper-compact">
                            {chartData && <DataTable headers={chartData.headers} data={filteredData} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
