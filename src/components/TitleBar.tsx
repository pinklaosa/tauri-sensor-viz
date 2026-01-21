import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Sun, Moon } from 'lucide-react';

interface TitleBarProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export default function TitleBar({ theme, toggleTheme }: TitleBarProps) {
    const appWindow = getCurrentWindow();

    return (
        <div className="titlebar">
            <div className="titlebar-drag-region" data-tauri-drag-region>
                {/* You can add app icon and title here */}
                <span style={{ pointerEvents: 'none' }}>Soothsayer-Wizard</span>
            </div>
            <div className="titlebar-actions">
                <button className="titlebar-button" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? (
                        <Sun size={16} />
                    ) : (
                        <Moon size={16} />
                    )}
                </button>
                <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: 'auto 0' }}></div>
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
