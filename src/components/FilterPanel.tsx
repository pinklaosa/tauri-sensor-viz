import { useState } from 'react';
import { ChevronDown, Calendar, ArrowLeft } from 'lucide-react';

interface FilterPanelProps {
    onDateRangeChange: (start: string, end: string) => void;
    onBack: () => void;
}

export default function FilterPanel({
    onDateRangeChange,
    onBack,
}: FilterPanelProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const applyDateFilter = () => {
        onDateRangeChange(startDate, endDate);
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
                <div className="filter-group-new">
                    <label>SENSOR TYPE</label>
                    <div className="select-mock">
                        <span>Sensor Type</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="filter-group-new">
                    <label>LOCATION</label>
                    <div className="select-mock">
                        <span>Location</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="filter-group-new time-range-group">
                    <label>TIME RANGE</label>
                    <div className="time-range-inputs">
                        <div className="date-input-wrapper">
                            <Calendar size={14} />
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                placeholder="Start Date"
                            />
                        </div>
                        <span className="separator">-</span>
                        <div className="date-input-wrapper">
                            <Calendar size={14} />
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                placeholder="End Date"
                            />
                        </div>
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
                    <button className="apply-btn" onClick={applyDateFilter}>APPLY FILTERS</button>
                </div>
            </div>
        </div>
    );
}
