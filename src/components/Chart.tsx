import { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { CsvRecord } from '../types';
import 'echarts-gl';

interface ChartProps {
    data: CsvRecord[];
    sensors: string[];
    headers: string[];
    chartType?: 'line' | 'scatter';
}

export default function Chart({ data, sensors, headers, chartType = 'line' }: ChartProps) {
    const colors = ["#3b82f6", "#10b981", "#6366f1", "#8b5cf6", "#f43f5e", "#f59e0b"];

    // State for scatter plot axes
    const [scatterX, setScatterX] = useState<string>('');
    const [scatterY, setScatterY] = useState<string>('');

    // Default axes selection when sensors change
    useEffect(() => {
        if (sensors.length >= 2) {
            // Keep existing selection if valid, otherwise pick first two
            if (!sensors.includes(scatterX)) setScatterX(sensors[0]);
            if (!sensors.includes(scatterY)) setScatterY(sensors[1]);
        } else if (sensors.length === 1) {
            setScatterX(sensors[0]);
            setScatterY(sensors[0]); // Fallback, though scatter usually needs 2 diff
        }
    }, [sensors, scatterX, scatterY]);

    // Performance optimization: Memoize the option generation
    const option = useMemo(() => {
        const dataCount = data.length;
        const isLargeData = dataCount > 10000;

        const commonOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                formatter: (params: any) => {
                    if (!params || (Array.isArray(params) && params.length === 0)) return '';
                    const pList = Array.isArray(params) ? params : [params];

                    if (chartType === 'scatter') {
                        const p = pList[0];
                        // scatterGL: value is [x, y]
                        const val = Array.isArray(p.value) ? p.value : [p.value];
                        return `<div style="font-weight:bold; margin-bottom:5px;">${scatterX} vs ${scatterY}</div>
                                <div style="display:flex; align-items:center; gap:5px;">
                                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${p.color};"></span>
                                    <span>X (${scatterX}): ${val[0]}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:5px;">
                                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${p.color};"></span>
                                    <span>Y (${scatterY}): ${val[1]}</span>
                                </div>`;
                    }

                    const firstParam = pList[0];
                    const dateStr = new Date(firstParam.axisValueLabel).toLocaleString();

                    let content = `<div style="font-weight:bold; margin-bottom:5px;">${dateStr}</div>`;

                    const maxItems = 10;
                    const displayParams = pList.slice(0, maxItems);

                    displayParams.forEach((p: any) => {
                        let val = p.value;
                        content += `<div style="display:flex; align-items:center; gap:5px;">
                            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${p.color};"></span>
                            <span>${p.seriesName}: ${val}</span>
                        </div>`;
                    });
                    if (pList.length > maxItems) {
                        content += `<div style="font-style:italic; margin-top:5px;">...and ${pList.length - maxItems} more</div>`;
                    }
                    return content;
                }
            },
            legend: {
                show: chartType !== 'scatter', // Hide legend for scatter since it's X vs Y
                data: sensors,
                textStyle: { color: '#94a3b8' },
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '5%',
                containLabel: true
            },
        };

        if (chartType === 'line') {
            return {
                ...commonOption,
                animation: !isLargeData,
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: data.map(d => d.timestamp),
                    axisLabel: {
                        formatter: (value: string) => new Date(value).toLocaleTimeString(),
                        color: '#94a3b8'
                    },
                    axisLine: { lineStyle: { color: '#334155' } }
                },
                yAxis: sensors.map((sensor, index) => {
                    const color = colors[index % colors.length];
                    return {
                        type: 'value',
                        name: sensor,
                        position: index % 2 === 0 ? 'left' : 'right',
                        offset: Math.floor(index / 2) * 60,
                        axisLine: { show: true, lineStyle: { color: color } },
                        axisLabel: { color: color },
                        splitLine: {
                            show: index === 0,
                            lineStyle: { color: '#334155', type: 'dashed', opacity: 0.3 }
                        }
                    };
                }),
                series: sensors.map((sensor, index) => {
                    const sensorIndex = headers.indexOf(sensor);
                    const color = colors[index % colors.length];
                    return {
                        name: sensor,
                        type: 'line',
                        yAxisIndex: index,
                        // Disabled downsampling as requested
                        sampling: undefined,
                        large: false,
                        data: data.map(d => {
                            if (sensorIndex === -1) return null;
                            const val = d.values[sensorIndex];
                            return val !== null ? val : null;
                        }),
                        smooth: !isLargeData,
                        showSymbol: false,
                        itemStyle: { color: color },
                        lineStyle: { width: isLargeData ? 1 : 2 },
                        emphasis: { focus: 'series' }
                    };
                })
            };
        } else {
            // Scatter Plot X vs Y
            const xIndex = headers.indexOf(scatterX);
            const yIndex = headers.indexOf(scatterY);

            return {
                ...commonOption,
                tooltip: {
                    ...commonOption.tooltip,
                    show: true,
                    trigger: 'item'
                },
                xAxis: {
                    type: 'value',
                    name: scatterX,
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLabel: { color: '#94a3b8' },
                    axisLine: { lineStyle: { color: '#334155' } },
                    splitLine: { show: false }
                },
                yAxis: {
                    type: 'value',
                    name: scatterY,
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' },
                    splitLine: {
                        show: true,
                        lineStyle: { color: '#334155', type: 'dashed', opacity: 0.3 }
                    }
                },
                series: [{
                    name: `${scatterX} vs ${scatterY}`,
                    type: 'scatterGL',
                    symbolSize: 3,
                    itemStyle: {
                        color: colors[0],
                        opacity: 0.6
                    },
                    data: data.map(d => {
                        if (xIndex === -1 || yIndex === -1) return null;
                        const valX = d.values[xIndex];
                        const valY = d.values[yIndex];
                        if (valX === null || valY === null) return null;
                        return [valX, valY];
                    }).filter(d => d !== null)
                }]
            }
        }
    }, [data, sensors, headers, chartType, scatterX, scatterY]);

    if (!sensors || sensors.length === 0) {
        return (
            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Select sensors to view data
            </div>
        );
    }

    if (chartType === 'scatter' && sensors.length < 2) {
        return (
            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Select at least 2 sensors for scatter plot
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {chartType === 'scatter' && sensors.length >= 2 && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50px',
                    zIndex: 10,
                    display: 'flex',
                    gap: '10px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    padding: '5px',
                    borderRadius: '4px'
                }}>
                    <select
                        value={scatterX}
                        onChange={e => setScatterX(e.target.value)}
                        style={{ backgroundColor: '#1e293b', color: 'white', padding: '2px 5px', borderRadius: '4px' }}
                    >
                        {sensors.map(s => <option key={s} value={s}>{s} (X)</option>)}
                    </select>
                    <span style={{ color: '#94a3b8' }}>vs</span>
                    <select
                        value={scatterY}
                        onChange={e => setScatterY(e.target.value)}
                        style={{ backgroundColor: '#1e293b', color: 'white', padding: '2px 5px', borderRadius: '4px' }}
                    >
                        {sensors.map(s => <option key={s} value={s}>{s} (Y)</option>)}
                    </select>
                </div>
            )}
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%', minHeight: '300px' }}
                notMerge={true}
                theme="dark"
            />
        </div>
    );
}
