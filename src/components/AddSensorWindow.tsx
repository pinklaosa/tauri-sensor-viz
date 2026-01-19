import { useState, useEffect, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import { SensorMetadata } from "../types";
import SensorSelection from "./SensorSelection";

interface SensorDataEvent {
    sensors: string[];
    selectedSensors: string[];
    sensorMetadata: SensorMetadata[] | null;
}

export default function AddSensorWindow() {
    const [sensors, setSensors] = useState<string[]>([]);
    const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
    const [sensorMetadata, setSensorMetadata] = useState<SensorMetadata[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unlistenData: UnlistenFn | undefined;

        const setup = async () => {
            // 1. Fetch all sensors from Rust AppState directly
            try {
                const allHeaders = await invoke<string[]>('get_all_sensors');
                // Filter out timestamp/time
                const filteredSensors = allHeaders.filter(h => {
                    const lower = h.trim().toLowerCase();
                    return lower !== 'timestamp' && lower !== 'time';
                });

                setSensors(filteredSensors);
            } catch (err) {
                console.error("Failed to fetch sensors from Rust:", err);
            }

            // Request data immediately (for selection/metadata)
            // Retry mechanism in case Dashboard wasn't ready to listen
            const requestData = async () => {
                console.log("Emitting request-sensors...");
                await emit('request-sensors');
            };

            requestData();
            // Retry every 1s
            const intervalId = setInterval(requestData, 1000);

            // Stop retrying after 5s or when component unmounts
            const timeoutId = setTimeout(() => clearInterval(intervalId), 5000);

            // We also need to clear interval when we successfully receive data
            unlistenData = await listen<SensorDataEvent>('sensors-data', (event) => {
                console.log("Received sensors-data");
                const { selectedSensors, sensorMetadata } = event.payload;
                // Note: we ignore 'sensors' from event as we fetched it from Rust
                setSelectedSensors(selectedSensors);
                setSensorMetadata(sensorMetadata);
                setLoading(false);
                clearInterval(intervalId); // Stop retrying
            });
        };

        setup();

        return () => {
            if (unlistenData) unlistenData();
        };
    }, []);

    // Sort sensors: Selected first, then alphabetical
    const sortedSensors = useMemo(() => {
        return [...sensors].sort((a, b) => {
            const aSelected = selectedSensors.includes(a);
            const bSelected = selectedSensors.includes(b);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.localeCompare(b);
        });
    }, [sensors, selectedSensors]);

    const handleClose = async () => {
        await getCurrentWindow().close();
    };

    const handleAdd = async () => {
        await emit('add-sensor-selection', selectedSensors);
        await handleClose();
    };

    return (
        <div className="add-sensor-window p-4 h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">Add Special Sensor</h2>
                <button
                    onClick={handleClose}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                    &times;
                </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] mb-4">
                {loading ? (
                    <div className="p-4 text-center text-[var(--text-secondary)]">Loading sensor data...</div>
                ) : (
                    <div className="p-2">
                        <SensorSelection
                            sensors={sortedSensors}
                            selectedSensors={selectedSensors}
                            onSensorChange={setSelectedSensors}
                            sensorMetadata={sensorMetadata}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)] flex-shrink-0">
                <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                    Update Sensors
                </button>
            </div>
        </div>
    );
}
