import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
    const appWindow = getCurrentWindow();

    return (
        <div className="titlebar">
            <div className="titlebar-drag-region" data-tauri-drag-region>
                {/* You can add app icon and title here */}
                <span style={{ pointerEvents: 'none' }}>Soothsayer-Wizard</span>
            </div>
            <div className="titlebar-actions">
                <button className="titlebar-button" onClick={() => { console.log('minimize'); appWindow.minimize(); }}>
                    <Minus size={16} />
                </button>
                <button className="titlebar-button" onClick={() => { console.log('maximize'); appWindow.toggleMaximize(); }}>
                    <Square size={14} />
                </button>
                <button className="titlebar-button close" onClick={() => { console.log('close'); appWindow.close(); }}>
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
