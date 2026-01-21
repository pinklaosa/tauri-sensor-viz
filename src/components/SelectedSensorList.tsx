import { SensorMetadata } from "../types";
import { Folder, X } from "lucide-react";

interface SelectedSensorListProps {
    selectedSensors: string[];
    sensorMetadata: SensorMetadata[] | null;
    onRemove: (sensor: string) => void;
}

export default function SelectedSensorList({
    selectedSensors,
    sensorMetadata,
    onRemove
}: SelectedSensorListProps) {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc]">
            <div className="px-4 py-2 border-b border-[#27272a] text-xs font-bold text-[#6b7280] tracking-wider uppercase">
                SELECTED ({selectedSensors.length})
            </div>

            <div className="flex-1 overflow-y-auto">
                {selectedSensors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#6b7280] gap-2">
                        <Folder size={24} className="opacity-50" />
                        <span className="text-sm">No sensors selected</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {selectedSensors.map(sensor => {
                            // Find metadata if available
                            const meta = sensorMetadata?.find(m => m.tag.trim().toLowerCase() === sensor.trim().toLowerCase());
                            const displayLabel = meta ? meta.description : sensor;
                            const tag = meta ? meta.tag : sensor;

                            return (
                                <div
                                    key={sensor}
                                    className="flex justify-between items-start p-2 hover:bg-[#2a2d2e] group px-4 py-2 border-b border-[#27272a]/50"
                                >
                                    <div className="flex flex-col overflow-hidden mr-2 min-w-0">
                                        <span className="text-sm font-medium truncate text-[#e1e1e1]" title={displayLabel}>
                                            {displayLabel}
                                        </span>
                                        {meta && (
                                            <span className="text-xs text-[#9ca3af] truncate">
                                                {meta.component}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-[#6b7280] truncate font-mono">
                                            {tag}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(sensor);
                                        }}
                                        className="p-1 text-[#6b7280] hover:text-[#cccccc] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
