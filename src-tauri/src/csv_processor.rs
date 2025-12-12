use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvRecord {
    pub timestamp: Option<String>,
    pub values: Vec<Option<f64>>,
}

#[derive(Debug, Serialize, Deserialize)]
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

pub fn read_csv(path: &str) -> Result<ProcessedData, String> {
    let total_start = Instant::now();
    // Parse data
    let file = File::open(path).map_err(|e| e.to_string())?;
    // Buffered reader for performance
    let mut rdr = csv::Reader::from_reader(BufReader::new(file));

    // Get headers
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let header_list: Vec<String> = headers.iter().map(|s| s.to_string()).collect();

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
