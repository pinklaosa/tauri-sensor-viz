import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, ArrowLeft } from 'lucide-react';

interface FilterPanelProps {
    onDateRangeChange: (start: string, end: string) => void;
    onSamplingChange: (method: 'raw' | 'avg' | 'max' | 'min' | 'first' | 'last') => void;
    onBack: () => void;
    dataRange?: { min: string, max: string };
}

export default function FilterPanel({
    onDateRangeChange,
    onSamplingChange,
    onBack,
    dataRange
}: FilterPanelProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [samplingMethod, setSamplingMethod] = useState<'raw' | 'avg' | 'max' | 'min' | 'first' | 'last'>('raw');

    // Helper to format date string for datetime-local input (YYYY-MM-DDThh:mm)
    const formatForInput = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';

            // Get local ISO string part
            const offset = date.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
            return localISOTime;
        } catch (e) {
            return '';
        }
    };

    // Auto-populate inputs if dataRange is provided and inputs are empty
    useEffect(() => {
        if (dataRange && !startDate && !endDate) {
            const startFmt = formatForInput(dataRange.min);
            const endFmt = formatForInput(dataRange.max);

            setStartDate(startFmt);
            setEndDate(endFmt);

            // Pass the formatted values to filtering
            // Note: Dashboard expects valid date strings. The input format (YYYY-MM-DDThh:mm) is parsable by new Date().
            onDateRangeChange(startFmt, endFmt);
        }
    }, [dataRange, startDate, endDate, onDateRangeChange]);

    const handleSamplingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const method = e.target.value as 'raw' | 'avg' | 'max' | 'min' | 'first' | 'last';
        setSamplingMethod(method);
        onSamplingChange(method);
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setStartDate(newVal);
        onDateRangeChange(newVal, endDate);
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setEndDate(newVal);
        onDateRangeChange(startDate, newVal);
    };

    return (
        <div className="filter-panel-new">
            <div className="filter-header">
                <button className="back-button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                    <ArrowLeft size={16} />
                </button>
                <ChevronDown size={16} />
                <span>FILTER & CONFIGURE</span>
            </div>
            <div className="filter-controls">
                
                <div className="filter-group-new time-range-group">
                    <label>TIME RANGE</label>
                    <div className="time-range-inputs">
                        <div className="date-input-wrapper">
                            <Calendar size={14} />
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={handleStartDateChange}
                                placeholder="Start Date"
                            />
                        </div>
                        <span className="separator">-</span>
                        <div className="date-input-wrapper">
                            <Calendar size={14} />
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={handleEndDateChange}
                                placeholder="End Date"
                            />
                        </div>
                    </div>
                </div>

                <div className="filter-group-new">
                    <label>SAMPLING (1 HR)</label>
                    <div className="select-mock" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        <select
                            value={samplingMethod}
                            onChange={handleSamplingChange}
                            style={{
                                width: '100%',
                                height: '100%',
                                background: '#1e293b',
                                color: 'white',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '5px'
                            }}
                        >
                            <option value="raw">Raw</option>
                            <option value="avg">Avg</option>
                            <option value="max">Max</option>
                            <option value="min">Min</option>
                            <option value="first">First</option>
                            <option value="last">Last</option>
                        </select>
                    </div>
                </div>

                <div className="filter-group-new">
                    <label>METRIC</label>
                    <div className="select-mock">
                        <span>Metric</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="filter-group-new">
                    <label>THRESHOLD</label>
                    <div className="select-mock">
                        <span>20</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="filter-group-new">
                    <label>DATA SOURCE</label>
                    <div className="select-mock">
                        <span>Data Source</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="filter-actions-new">
                    <button
                        onClick={() => {
                            if (dataRange) {
                                const s = formatForInput(dataRange.min);
                                const e = formatForInput(dataRange.max);
                                setStartDate(s);
                                setEndDate(e);
                                onDateRangeChange(s, e);
                            } else {
                                setStartDate('');
                                setEndDate('');
                                onDateRangeChange('', '');
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '8px 16px',
                            backgroundColor: '#334155',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        RESET
                    </button>
                </div>
            </div>
        </div>
    );
}
