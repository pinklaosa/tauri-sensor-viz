export interface CsvRecord {
    timestamp: string | null;
    values: (number | null)[];
}

export interface ProcessedData {
    headers: string[];
    rows: CsvRecord[];
}

export interface CsvMetadata {
    headers: string[];
    total_rows: number;
}

export interface SensorMetadata {
    tag: string;
    description: string;
    unit: string;
    component: string;
}
