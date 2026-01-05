import { useMemo, useState, useEffect, memo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CsvRecord } from '../types';
import 'echarts-gl';

interface ChartProps {
    data: CsvRecord[];
    sensors: string[];
    headers: string[];
    chartType?: 'line' | 'scatter' | 'pair';
}

function Chart({ data, sensors, headers, chartType = 'line' }: ChartProps) {
    const colors = ["#3b82f6", "#10b981", "#6366f1", "#8b5cf6", "#f43f5e", "#f59e0b"];

    // State for scatter plot axes (Single Scatter Mode)
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
            setScatterY(sensors[0]);
        }
    }, [sensors, scatterX, scatterY]);

    // Performance optimization: Memoize the option generation
    const option = useMemo(() => {
        const dataCount = data.length;
        const isLargeData = dataCount > 10000;

        const commonOption = {
            backgroundColor: 'transparent',
            textStyle: { fontFamily: 'Inter, system-ui, sans-serif' }
        };

        // =================================================================================
        // PAIR PLOT LOGIC (Refined: Row Centric)
        // =================================================================================
        if (chartType === 'pair') {
            const n = sensors.length;
            if (n < 2) return {};

            // Layout: N rows x (N+1) columns
            // Col 0: Histogram (Distribution of Row Sensor) -> Wider
            // Col 1..N-1: Scatter (Row Sensor vs Other Sensors)
            // Col N: Time Series (Row Sensor)

            const grids: any[] = [];
            const xAxes: any[] = [];
            const yAxes: any[] = [];
            const series: any[] = [];

            const totalWidth = 100;
            const totalHeight = 100;
            const margin = 5; // % Increased to accommodate right-side Y-axis labels

            // Layout: N rows x (N + 1) columns
            // Cols: [Hist, Scatter_1, ..., Scatter_N-1, Time]
            const totalCols = n + 1;

            const matrixLeft = 4;
            const matrixTop = 5;
            const matrixHeight = totalHeight - 5 - 4; // Top and Bottom margins
            const matrixWidth = totalWidth - matrixLeft - margin; // Available width

            const gap = 2; // Increased from 0.5 to 2

            const cellHeight = (matrixHeight - (n - 1) * gap) / n;
            const cellWidth = (matrixWidth - (totalCols - 1) * gap) / totalCols;

            // Histograms helpers
            const calculateHistogram = (sensorVals: number[], min: number, max: number) => {
                const valid = sensorVals.filter(v => v !== null && !isNaN(v));
                if (valid.length === 0) return [];

                const bins = 20;
                const step = (max - min) / bins;

                // If constant value
                if (step === 0) {
                    // small range around min
                    return [[valid.length, min, min, min]];
                }

                const hist = new Array(bins).fill(0);
                const binEdges = new Array(bins + 1).fill(0).map((_, i) => min + i * step);

                valid.forEach(v => {
                    let idx = Math.floor((v - min) / step);
                    if (idx >= bins) idx = bins - 1;
                    if (idx < 0) idx = 0;
                    hist[idx]++;
                });
                return hist.map((count, i) => {
                    const mid = binEdges[i] + step / 2;
                    // [count, mid, min, max]
                    return [count, mid, binEdges[i], binEdges[i + 1]];
                });
            };

            // Pre-calculate data needed
            const sensorDataMap = sensors.map(s => {
                const idx = headers.indexOf(s);
                const vals = data.map(d => d.values[idx] ?? NaN);
                const validVals = vals.filter(v => !isNaN(v));
                const min = validVals.length ? Math.min(...validVals) : 0;
                const max = validVals.length ? Math.max(...validVals) : 1;

                return {
                    name: s,
                    idx: idx,
                    vals: vals,
                    min,
                    max,
                    hist: calculateHistogram(vals, min, max)
                };
            });

            // Iterate Rows (Sensor i)
            sensors.forEach((sensorY, i) => {
                const dataY = sensorDataMap[i];
                // const otherSensors = sensors.filter(s => s !== sensorY); // Removed unused

                const rowTop = matrixTop + i * (cellHeight + gap);

                // 1. Iterate Grid Columns (0 to N-1) for Sensor Relationships
                for (let k = 0; k < n; k++) {
                    const colIdx = k;
                    const colLeft = matrixLeft + (colIdx * (cellWidth + gap));
                    const gridIndex = grids.length;

                    // DIAGONAL: Histogram (k === i)
                    if (k === i) {
                        grids.push({
                            left: `${colLeft}%`,
                            top: `${rowTop}%`,
                            width: `${cellWidth}%`,
                            height: `${cellHeight}%`,
                            containLabel: false,
                            show: true, // Border ON
                            borderColor: '#475569',
                            borderWidth: 1
                        });

                        // X-Axis: Count (Horizontal)
                        xAxes.push({
                            gridIndex,
                            type: 'value',
                            name: 'Count', // Label Count
                            nameLocation: 'middle',
                            nameGap: 10,
                            nameTextStyle: { fontSize: 9, color: '#64748b' },
                            show: true,
                            axisLabel: { show: true, fontSize: 8, color: '#94a3b8' },
                            splitLine: { show: false },
                            min: 0
                        });

                        // Y-Axis: Sensor Value (Vertical) - Aligned with Row
                        yAxes.push({
                            gridIndex,
                            type: 'value',
                            name: sensorY,
                            nameLocation: 'middle',
                            nameGap: 25,
                            nameRotate: 90,
                            nameTextStyle: { fontSize: 10, color: '#cbd5e1' },
                            show: true,
                            axisLabel: { show: true, color: '#94a3b8', fontSize: 9, margin: 2 },
                            axisTick: { show: false },
                            splitLine: { show: false },
                            scale: true // Auto-scale
                        });

                        series.push({
                            type: 'custom',
                            xAxisIndex: gridIndex,
                            yAxisIndex: gridIndex,
                            data: dataY.hist,
                            renderItem: (params: any, api: any) => {
                                const count = api.value(0);
                                const yMin = api.value(2);
                                const yMax = api.value(3);

                                const start = api.coord([0, yMax]); // Top-Left (Y max is upper)
                                const end = api.coord([count, yMin]); // Bottom-Right
                                const width = end[0] - start[0];
                                const height = end[1] - start[1];

                                return {
                                    type: 'rect',
                                    shape: {
                                        x: start[0],
                                        y: start[1],
                                        width: width,
                                        height: height
                                    },
                                    style: api.style()
                                };
                            },
                            encode: { x: 0, y: [2, 3] }, // Data: [count, mid, min, max]
                            itemStyle: { color: '#6366f1', opacity: 0.8 }
                        });
                    }

                    // UPPER TRIANGLE: Scatter (k > i)
                    else if (k > i) {
                        const sensorX = sensors[k];
                        const dataX = sensorDataMap.find(d => d.name === sensorX)!;

                        grids.push({
                            left: `${colLeft}%`,
                            top: `${rowTop}%`,
                            width: `${cellWidth}%`,
                            height: `${cellHeight}%`,
                            containLabel: false,
                            show: true, // Border ON
                            borderColor: '#475569',
                            borderWidth: 1
                        });

                        xAxes.push({
                            gridIndex,
                            type: 'value',
                            name: i === 0 ? sensorX : '', // Label only on first row
                            nameLocation: 'middle',
                            nameGap: 5,
                            position: 'top',
                            show: true,
                            nameTextStyle: { fontSize: 10, color: '#f8fafc' },
                            axisLabel: { show: i === 0, color: '#94a3b8', fontSize: 9, margin: 2 },
                            axisTick: { show: false },
                            axisLine: { show: false }, // Hide axis line
                            splitLine: { show: false },
                            scale: true // Auto-scale
                        });

                        yAxes.push({
                            gridIndex,
                            type: 'value',
                            show: false,
                            scale: true // Auto-scale
                        });

                        series.push({
                            type: isLargeData ? 'scatterGL' : 'scatter',
                            symbol: 'circle',
                            xAxisIndex: gridIndex,
                            yAxisIndex: gridIndex,
                            itemStyle: { color: colors[0], opacity: 0.6 },
                            symbolSize: 3,
                            large: false,
                            data: data.map(d => {
                                const valX = d.values[dataX.idx];
                                const valY = d.values[dataY.idx];
                                if (valX == null || valY == null) return null;
                                return [valX, valY];
                            }).filter(Boolean)
                        });
                    }
                }

                // 3. Last Column: Time Series
                {
                    const gridIndex = grids.length;
                    // Position: Last Column (Index N)
                    // Total N+1 cols, indices 0..N.
                    const colIdx = n;
                    const colLeft = matrixLeft + (colIdx * (cellWidth + gap));

                    grids.push({
                        left: `${colLeft}%`,
                        top: `${rowTop}%`,
                        width: `${cellWidth}%`,
                        height: `${cellHeight}%`,
                        containLabel: false,
                        show: true, // Border ON
                        borderColor: '#939dacff',
                        borderWidth: 1
                    });

                    xAxes.push({
                        gridIndex,
                        type: 'time',
                        name: i === 0 ? 'timeseries' : '',
                        nameLocation: 'middle',
                        nameGap: 5,
                        position: 'top',
                        nameTextStyle: { fontSize: 10, color: '#f8fafc' },
                        axisLabel: { show: i === 0, formatter: '{yyyy}-{MM}', color: '#cbd5e1', fontSize: 9, margin: 2 },
                        axisLine: { show: false }, // Hide axis line
                        splitLine: { show: false },
                        axisTick: { show: false },

                        show: true
                    });

                    yAxes.push({
                        gridIndex,
                        type: 'value',
                        show: true,
                        position: 'right',
                        axisLabel: { show: true, color: '#94a3b8', fontSize: 9, margin: 2 },
                        splitLine: { show: false },
                        scale: true // Auto-scale
                    });

                    series.push({
                        type: isLargeData ? 'scatterGL' : 'scatter',
                        symbol: 'circle',
                        xAxisIndex: gridIndex,
                        yAxisIndex: gridIndex,
                        symbolSize: 3,
                        itemStyle: { color: '#60a5fa', opacity: 0.8 },
                        large: false,
                        data: data.map(d => {
                            const val = d.values[dataY.idx];
                            if (val == null || !d.timestamp) return null;
                            return [new Date(d.timestamp).getTime(), val];
                        }).filter(Boolean)
                    });
                }
            });

            return {
                ...commonOption,
                tooltip: {
                    trigger: 'item',
                    formatter: (params: any) => {
                        if (!params.value) return '';

                        const isTimeSeries = params.seriesType === 'line' ||
                            ((params.seriesType === 'scatter' || params.seriesType === 'scatterGL') && params.value[0] > 1000000000000);

                        if (isTimeSeries) {
                            return `Time: ${new Date(params.value[0]).toLocaleString()}<br/>Val: ${params.value[1]}`;
                        }
                        if (params.seriesType === 'custom') {
                            const count = params.value[0];
                            const minVal = params.value[2];
                            const maxVal = params.value[3];
                            return `Value: ${minVal?.toFixed(2)} - ${maxVal?.toFixed(2)}<br/>Count: ${count}`;
                        }
                        if (params.seriesType === 'bar') {
                            return `Range: ${params.value[2]?.toFixed(2)} - ${params.value[3]?.toFixed(2)}<br/>Count: ${params.value[0]}`;
                        }
                        if (Array.isArray(params.value)) {
                            return `X: ${params.value[0].toFixed(2)}<br/>Y: ${params.value[1].toFixed(2)}`;
                        }
                        return '';
                    }
                },
                grid: grids,
                xAxis: xAxes,
                yAxis: yAxes,
                series: series
            };
        }

        // =================================================================================
        // LINE CHART LOGIC
        // =================================================================================

        if (chartType === 'line') {
            return {
                ...commonOption,
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    borderColor: '#334155',
                    textStyle: { color: '#f8fafc' },
                    formatter: (params: any) => {
                        if (!params || (Array.isArray(params) && params.length === 0)) return '';
                        const pList = Array.isArray(params) ? params : [params];
                        const dateStr = new Date(pList[0].axisValueLabel).toLocaleString();
                        let content = `<div style="font-weight:bold; margin-bottom:5px;">${dateStr}</div>`;
                        const maxItems = 10;
                        pList.slice(0, maxItems).forEach((p: any) => {
                            content += `<div style="display:flex; align-items:center; gap:5px;">
                                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${p.color};"></span>
                                <span>${p.seriesName}: ${p.value}</span>
                            </div>`;
                        });
                        return content;
                    }
                },
                legend: { data: sensors, textStyle: { color: '#94a3b8' }, bottom: 0 },
                grid: { left: '3%', right: '4%', bottom: '10%', top: '5%', containLabel: true },
                animation: !isLargeData,
                dataZoom: [
                    { type: 'inside', xAxisIndex: [0], filterMode: 'filter' },
                    { type: 'slider', xAxisIndex: [0], filterMode: 'filter', bottom: 10 }
                ],
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: data.map(d => d.timestamp),
                    axisLabel: { formatter: (val: string) => new Date(val).toLocaleTimeString(), color: '#94a3b8' },
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
                        splitLine: { show: index === 0, lineStyle: { color: '#334155', type: 'dashed', opacity: 0.3 } }
                    };
                }),
                series: sensors.map((sensor, index) => {
                    const sensorIdx = headers.indexOf(sensor);
                    const color = colors[index % colors.length];
                    return {
                        name: sensor,
                        type: 'line',
                        yAxisIndex: index,
                        data: data.map(d => d.values[sensorIdx] ?? null),
                        smooth: !isLargeData,
                        showSymbol: false,
                        itemStyle: { color: color },
                        lineStyle: { width: isLargeData ? 1 : 2 }
                    };
                })
            };
        }

        // =================================================================================
        // SCATTER PLOT LOGIC (Single Pair)
        // =================================================================================
        else {
            const xIndex = headers.indexOf(scatterX);
            const yIndex = headers.indexOf(scatterY);

            return {
                ...commonOption,
                animation: !isLargeData,
                toolbox: {
                    show: true,
                    right: 20,
                    top: 10,
                    feature: {
                        dataZoom: { title: { zoom: 'Brush Zoom', back: 'Reset Zoom' } },
                        restore: { title: 'Reset All' }
                    },
                    iconStyle: { borderColor: '#94a3b8' },
                    emphasis: { iconStyle: { borderColor: '#6366f1' } }
                },
                grid: { left: '3%', right: '4%', bottom: '5%', top: '5%', containLabel: true },
                dataZoom: [
                    { type: 'inside', xAxisIndex: [0], filterMode: 'filter' },
                    { type: 'inside', yAxisIndex: [0], filterMode: 'filter' },
                    { type: 'slider', xAxisIndex: [0], filterMode: 'filter', bottom: 10, height: 20, handleSize: '100%' },
                    { type: 'slider', yAxisIndex: [0], filterMode: 'filter', right: 10, width: 20, handleSize: '100%' }
                ],
                tooltip: {
                    show: true,
                    trigger: 'axis',
                    axisPointer: { type: 'cross', crossStyle: { color: '#6366f1', width: 1 }, label: { show: true, backgroundColor: 'rgba(99, 102, 241, 0.9)' } },
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    borderColor: '#334155',
                    textStyle: { color: '#f8fafc' },
                    formatter: (params: any) => {
                        if (!params || params.length === 0) return '';
                        const xVal = params[0]?.axisValue ?? params[0]?.value?.[0] ?? '-';
                        const yVal = params[0]?.value?.[1] ?? '-';
                        return `<div style="font-weight:bold; margin-bottom:8px; color:#a5b4fc;">${scatterX} vs ${scatterY}</div>
                                 <div>X: ${typeof xVal === 'number' ? xVal.toFixed(4) : xVal}</div>
                                 <div>Y: ${typeof yVal === 'number' ? yVal.toFixed(4) : yVal}</div>`;
                    }
                },
                xAxis: {
                    type: 'value',
                    name: scatterX,
                    nameLocation: 'middle',
                    nameGap: 30,
                    scale: true,
                    axisLabel: { color: '#94a3b8' },
                    axisLine: { lineStyle: { color: '#334155' } },
                    splitLine: { show: false }
                },
                yAxis: {
                    type: 'value',
                    name: scatterY,
                    scale: true,
                    axisLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' },
                    splitLine: { show: true, lineStyle: { color: '#334155', type: 'dashed', opacity: 0.3 } }
                },
                series: [{
                    name: `${scatterX} vs ${scatterY}`,
                    type: isLargeData ? 'scatterGL' : 'scatter',
                    clip: true,
                    dimensions: [scatterX, scatterY, 'Time'],
                    ...(isLargeData ? { progressive: 1000000, progressiveThreshold: 5000 } : { large: true, largeThreshold: 2000 }),
                    symbolSize: 5,
                    itemStyle: { color: colors[0], opacity: 0.5 },
                    data: data.map(d => {
                        if (xIndex === -1 || yIndex === -1) return null;
                        const valX = d.values[xIndex];
                        const valY = d.values[yIndex];
                        if (valX === null || valY === null) return null;
                        return [valX, valY, d.timestamp ? new Date(d.timestamp).getTime() : 0];
                    }).filter(Boolean)
                }]
            }
        }
    }, [data, sensors, headers, chartType, scatterX, scatterY]);

    if (!sensors || sensors.length === 0) {
        return <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '20%' }}>Select sensors to view data</div>;
    }
    if ((chartType === 'scatter' || chartType === 'pair') && sensors.length < 2) {
        return <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '20%' }}>Select at least 2 sensors</div>;
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {chartType === 'scatter' && sensors.length >= 2 && (
                <div style={{ position: 'absolute', top: '10px', left: '50px', zIndex: 10, display: 'flex', gap: '10px', background: 'rgba(30, 41, 59, 0.8)', padding: '5px', borderRadius: '4px' }}>
                    <select value={scatterX} onChange={e => setScatterX(e.target.value)} style={{ backgroundColor: '#1e293b', color: 'white', border: 'none' }}>
                        {sensors.map(s => <option key={s} value={s}>{s} (X)</option>)}
                    </select>
                    <span style={{ color: '#94a3b8' }}>vs</span>
                    <select value={scatterY} onChange={e => setScatterY(e.target.value)} style={{ backgroundColor: '#1e293b', color: 'white', border: 'none' }}>
                        {sensors.map(s => <option key={s} value={s}>{s} (Y)</option>)}
                    </select>
                </div>
            )}
            <ReactECharts option={option} style={{ height: '100%', width: '100%', minHeight: '300px' }} notMerge={true} theme="dark" />
        </div>
    );
}

export default memo(Chart);
