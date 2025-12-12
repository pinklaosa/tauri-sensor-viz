mod csv_processor;
use csv_processor::{load_metadata, read_csv, CsvMetadata, ProcessedData, SensorMetadata};
use std::sync::Mutex;
use tauri::State;

struct AppState(Mutex<Option<ProcessedData>>);

#[tauri::command]
fn load_csv(path: String, state: State<AppState>) -> Result<CsvMetadata, String> {
    let data = read_csv(&path)?;
    let metadata = CsvMetadata {
        headers: data.headers.clone(),
        total_rows: data.rows.len(),
    };

    let mut state_data = state.0.lock().map_err(|e| e.to_string())?;
    *state_data = Some(data);

    Ok(metadata)
}

#[tauri::command]
fn get_data(sensors: Vec<String>, state: State<AppState>) -> Result<ProcessedData, String> {
    let state_data = state.0.lock().map_err(|e| e.to_string())?;
    let data = state_data.as_ref().ok_or("No data loaded")?;

    // Always include timestamp (assuming it's usually the first column or identified by name,
    // but here we'll take the implementation that relies on how data is stored.
    // The previous implementation of ProcessedData has all columns in `values`.
    // We need to filter `values` based on `headers`.

    // Find indices of requested sensors
    let mut indices = Vec::new();
    for sensor in &sensors {
        if let Some(idx) = data.headers.iter().position(|h| h == sensor) {
            indices.push(idx);
        }
    }

    let filtered_rows = data
        .rows
        .iter()
        .map(|row| {
            let mut new_values = Vec::new();
            // Since CsvRecord values map 1:1 to headers (with None for timestamp column),
            // we essentially just pick the values at the matching indices.
            for &idx in &indices {
                if idx < row.values.len() {
                    new_values.push(row.values[idx]);
                } else {
                    new_values.push(None);
                }
            }

            csv_processor::CsvRecord {
                timestamp: row.timestamp.clone(),
                values: new_values,
            }
        })
        .collect();

    Ok(ProcessedData {
        headers: sensors,
        rows: filtered_rows,
    })
}

#[tauri::command]
fn load_metadata_command(path: String) -> Result<Vec<SensorMetadata>, String> {
    load_metadata(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            load_csv,
            get_data,
            load_metadata_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
