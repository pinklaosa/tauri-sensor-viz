import { useState } from 'react';
import { SensorMetadata } from '../types';

interface SensorSelectionProps {
    sensors: string[];
    selectedSensors: string[];
    onSensorChange: (sensors: string[]) => void;
    sensorMetadata: SensorMetadata[] | null;
}

export default function SensorSelection({
    sensors,
    selectedSensors,
    onSensorChange,
    sensorMetadata
}: SensorSelectionProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSensorToggle = (sensor: string) => {
        if (selectedSensors.includes(sensor)) {
            onSensorChange(selectedSensors.filter(s => s !== sensor));
        } else {
            onSensorChange([...selectedSensors, sensor]);
        }
    };

    const getMetadata = (sensor: string) => {
        if (!sensorMetadata) return null;
        return sensorMetadata.find(m => m.tag === sensor || m.tag.toLowerCase() === sensor.toLowerCase());
    };

    const filteredSensors = sensors.filter(s => {
        const meta = getMetadata(s);
        const searchTarget = meta
            ? `${s} ${meta.description} ${meta.component} ${meta.unit}`.toLowerCase()
            : s.toLowerCase();
        return searchTarget.includes(searchTerm.toLowerCase());
    });

    const handleSelectAll = () => {
        const newSelected = Array.from(new Set([...selectedSensors, ...filteredSensors]));
        onSensorChange(newSelected);
    };

    const handleDeselectAll = () => {
        const newSelected = selectedSensors.filter(s => !filteredSensors.includes(s));
        onSensorChange(newSelected);
    };

    return (
        <div className="sensor-selection-widget">
            <div className="widget-header">
                <input
                    type="text"
                    placeholder="Search sensors..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input-compact"
                />
                <div className="sensor-actions-compact">
                    <button className="text-btn" onClick={handleSelectAll}>All</button>
                    <button className="text-btn" onClick={handleDeselectAll}>None</button>
                </div>
            </div>

            <div className="sensor-list-widget">
                <div className="sensor-list-header-row">
                    <span>Sensor</span>
                    <span>Status</span>
                </div>
                {filteredSensors.map(sensor => (
                    <div
                        key={sensor}
                        className="sensor-list-row"
                        onClick={() => handleSensorToggle(sensor)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                id={`sensor-${sensor}`}
                                checked={selectedSensors.includes(sensor)}
                                onChange={() => handleSensorToggle(sensor)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label htmlFor={`sensor-${sensor}`} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', fontWeight: 500 }}>
                                    {(() => {
                                        const meta = getMetadata(sensor);
                                        return meta ? meta.description : sensor;
                                    })()}
                                </label>
                                {(() => {
                                    const meta = getMetadata(sensor);
                                    if (meta) {
                                        return (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {meta.tag} • {meta.unit} • {meta.component}
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                        <span className="status-indicator">
                            <span className="dot active"></span> Active
                        </span>
                    </div>
                ))}
                {filteredSensors.length === 0 && (
                    <div className="no-results">No sensors found</div>
                )}
            </div>
        </div>
    );
}
