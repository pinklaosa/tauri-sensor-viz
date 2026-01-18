use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvRecord {
    pub timestamp: Option<String>,
    pub values: Vec<Option<f64>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessedData {
    pub headers: Vec<String>,
    pub rows: Vec<CsvRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvMetadata {
    pub headers: Vec<String>,
    pub total_rows: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SensorMetadata {
    pub tag: String,
    pub description: String,
    pub unit: String,
    pub component: String,
}

use rayon::prelude::*;

use std::collections::{BTreeMap, HashSet};

pub fn read_csv(path: &str) -> Result<ProcessedData, String> {
    let total_start = Instant::now();
    // Parse data
    let file = File::open(path).map_err(|e| e.to_string())?;
    // Buffered reader for performance
    let mut rdr = csv::Reader::from_reader(BufReader::new(file));

    // Get headers
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let header_list: Vec<String> = headers.iter().map(|s| s.trim().to_string()).collect();

    // Identify timestamp column index
    let timestamp_idx = header_list
        .iter()
        .position(|h| h.eq_ignore_ascii_case("timestamp") || h.eq_ignore_ascii_case("time"));

    // 1. Read all raw byte records into memory (Sequential I/O)
    let io_start = Instant::now();
    let mut raw_records = Vec::new();
    let mut byte_record = csv::ByteRecord::new();
    while rdr
        .read_byte_record(&mut byte_record)
        .map_err(|e| e.to_string())?
    {
        raw_records.push(byte_record.clone());
    }
    println!("Reading raw bytes took: {:?}", io_start.elapsed());

    // 2. Parse records in parallel (Parallel CPU)
    let parse_start = Instant::now();
    let records: Vec<CsvRecord> = raw_records
        .par_iter()
        .map(|raw_record| {
            let mut timestamp: Option<String> = None;
            let mut values: Vec<Option<f64>> = Vec::with_capacity(header_list.len());

            for (i, field) in raw_record.iter().enumerate() {
                let field_str = std::str::from_utf8(field).unwrap_or("");

                if Some(i) == timestamp_idx {
                    if !field_str.trim().is_empty() {
                        timestamp = Some(field_str.to_string());
                    }
                    // Placeholder for timestamp in values array to keep indices aligned with headers
                    values.push(None);
                } else {
                    let val = if field_str.trim().is_empty() {
                        None
                    } else {
                        field_str.parse::<f64>().ok()
                    };
                    values.push(val);
                }
            }

            CsvRecord { timestamp, values }
        })
        .collect();

    println!("Parallel parsing took: {:?}", parse_start.elapsed());
    println!("Total read_csv took: {:?}", total_start.elapsed());

    Ok(ProcessedData {
        headers: header_list,
        rows: records,
    })
}

pub fn read_merge_csvs(paths: Vec<String>) -> Result<ProcessedData, String> {
    if paths.is_empty() {
        return Err("No file paths provided".to_string());
    }

    // 1. Read all files individually
    let mut datasets = Vec::new();
    for path in &paths {
        datasets.push(read_csv(path)?);
    }

    if datasets.is_empty() {
        return Err("No data loaded".to_string());
    }

    // 2. Determine global headers (Superset)
    // Start with the first dataset's headers
    let mut global_headers: Vec<String> = Vec::new();
    let mut seen_headers: HashSet<String> = HashSet::new();

    // Helper to check if a header is a timestamp
    let is_timestamp = |h: &str| h.eq_ignore_ascii_case("timestamp") || h.eq_ignore_ascii_case("time");

    // Find valid timestamp header from first dataset to be the canonical "timestamp" column
    // Actually, we want to maintain the "timestamp" column at a specific position or simply identify it.
    // Let's assume the first dataset has a valid timestamp column or we pick one.
    // read_csv keeps all headers, including timestamp.

    // Let's iterate datasets and merge headers.
    // We treat "timestamp"/"time" as a special unique key column.
    
    // We will use the timestamp column name from the first dataset as the canonical one in global headers.
    // If not found, default to "timestamp".
    let canonical_ts_header = datasets[0].headers.iter()
        .find(|h| is_timestamp(h))
        .cloned()
        .unwrap_or_else(|| "timestamp".to_string());

    // Initialize global headers with canonical timestamp
    global_headers.push(canonical_ts_header.clone());
    seen_headers.insert(canonical_ts_header.clone().to_lowercase());

    // Add other headers
    for ds in &datasets {
        for h in &ds.headers {
            if is_timestamp(h) {
                continue; // Already handled canonical timestamp
            }
            if !seen_headers.contains(&h.to_lowercase()) {
                global_headers.push(h.clone());
                seen_headers.insert(h.to_lowercase());
            }
        }
    }

    // 3. Merge Rows
    // Map: Timestamp -> Vector of Values (size = global_headers.len())
    // Note: values in CsvRecord include the timestamp column as None.
    // We need to map local column indices to global column indices.

    // Use BTreeMap to sort by timestamp automatically
    let mut merged_map: BTreeMap<String, Vec<Option<f64>>> = BTreeMap::new();

    for ds in &datasets {
        // Build column mapping: local_idx -> global_idx
        let mut col_map: Vec<usize> = Vec::with_capacity(ds.headers.len());
        for h in &ds.headers {
            if is_timestamp(h) {
                // Map to the canonical timestamp index (0)
                col_map.push(0);
            } else {
                // Find index in global_headers
                // This is O(N*M), but N (headers) is small usually.
                if let Some(pos) = global_headers.iter().position(|gh| gh.eq_ignore_ascii_case(h)) {
                    col_map.push(pos);
                } else {
                     // Should not happen as we built global_headers from all headers
                     col_map.push(0); // Fallback, though unsafe if logic wrong
                }
            }
        }

        for row in &ds.rows {
            if let Some(ts) = &row.timestamp {
                let entry = merged_map
                    .entry(ts.clone())
                    .or_insert_with(|| vec![None; global_headers.len()]);
                
                for (local_idx, val) in row.values.iter().enumerate() {
                    if local_idx < col_map.len() {
                         let global_idx = col_map[local_idx];
                         // If we have a value, overwrite/fill.
                         // Note: timestamp col in 'values' is None, so it won't overwrite valid data at global_idx 0 if we put data there.
                         // But index 0 is canonical timestamp, and 'values' stores None for timestamp.
                         if let Some(v) = val {
                             entry[global_idx] = Some(*v);
                         }
                    }
                }
            }
        }
    }

    // 4. Convert back to ProcessedData
    let merged_rows: Vec<CsvRecord> = merged_map
        .into_iter()
        .map(|(ts, values)| CsvRecord {
            timestamp: Some(ts),
            values,
        })
        .collect();

    println!("Merged {} files. Total rows: {}", datasets.len(), merged_rows.len());
    if !merged_rows.is_empty() {
        println!("Timestamp Range: {:?} - {:?}", 
            merged_rows.first().and_then(|r| r.timestamp.as_ref()), 
            merged_rows.last().and_then(|r| r.timestamp.as_ref())
        );
    }

    Ok(ProcessedData {
        headers: global_headers,
        rows: merged_rows,
    })
}

pub fn load_metadata(path: &str) -> Result<Vec<SensorMetadata>, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut rdr = csv::Reader::from_reader(BufReader::new(file));
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();

    // Map headers to indices case-insensitively
    let mut tag_idx = None;
    let mut desc_idx = None;
    let mut unit_idx = None;
    let mut comp_idx = None;

    for (i, h) in headers.iter().enumerate() {
        match h.trim().to_lowercase().as_str() {
            "tag" => tag_idx = Some(i),
            "description" => desc_idx = Some(i),
            "unit" => unit_idx = Some(i),
            "component" => comp_idx = Some(i),
            _ => {}
        }
    }

    // Require at least TAG to proceed? Or just try best effort.
    // Allowing missing columns to be empty strings.

    let mut metadata_list = Vec::new();

    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;

        let tag = tag_idx
            .and_then(|i| record.get(i))
            .unwrap_or("")
            .to_string();
        // Skip empty rows or rows without a tag
        if tag.trim().is_empty() {
            continue;
        }

        let description = desc_idx
            .and_then(|i| record.get(i))
            .unwrap_or("")
            .to_string();
        let unit = unit_idx
            .and_then(|i| record.get(i))
            .unwrap_or("")
            .to_string();
        let component = comp_idx
            .and_then(|i| record.get(i))
            .unwrap_or("")
            .to_string();

        metadata_list.push(SensorMetadata {
            tag,
            description,
            unit,
            component,
        });
    }

    Ok(metadata_list)
}

#[allow(dead_code)]
pub fn sample_data(data: Vec<CsvRecord>) -> Vec<CsvRecord> {
    data
}
