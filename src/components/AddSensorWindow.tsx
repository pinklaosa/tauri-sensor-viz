import { getCurrentWindow } from "@tauri-apps/api/window";

export default function AddSensorWindow() {
    const handleClose = async () => {
        await getCurrentWindow().close();
    };

    return (
        <div className="add-sensor-window p-4 h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Add Special Sensor</h2>
                    <button
                        onClick={handleClose}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        &times;
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <p className="text-[var(--text-secondary)]">New sensor configuration will appear here.</p>
                    {/* Add form functionality here later */}
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                        Add Sensor
                    </button>
                </div>
            </div>
        </div>
    );
}
