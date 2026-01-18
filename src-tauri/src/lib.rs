mod csv_processor;
use csv_processor::{load_metadata, CsvMetadata, ProcessedData, SensorMetadata};
use std::sync::Mutex;
use tauri::{Emitter, State};

struct AppState(Mutex<Option<ProcessedData>>);

#[tauri::command]
fn load_csv(paths: Vec<String>, state: State<AppState>) -> Result<CsvMetadata, String> {
    let data = csv_processor::read_merge_csvs(paths)?;
    let metadata = CsvMetadata {
        headers: data.headers.clone(),
        total_rows: data.rows.len(),
    };

    let mut state_data = state.0.lock().map_err(|e| e.to_string())?;
    *state_data = Some(data);

    Ok(metadata)
}

#[tauri::command]
fn get_data(
    sensors: Vec<String>,
    window: tauri::Window,
    state: State<AppState>,
) -> Result<(), String> {
    let state_data = state.0.lock().map_err(|e| e.to_string())?;
    let data = state_data.as_ref().ok_or("No data loaded")?;

    // Find indices of requested sensors
    let mut indices = Vec::new();
    for sensor in &sensors {
        if let Some(idx) = data.headers.iter().position(|h| h == sensor) {
            indices.push(idx);
        }
    }
    
    // Using chunks to stream data
    // Chunk size 5000 seems reasonable for UI responsiveness vs IPC overhead
    const CHUNK_SIZE: usize = 5000;
    
    // Notify start (optional, but good for UI loading state if needed)
    // window.emit("data-stream-start", data.rows.len()).map_err(|e| e.to_string())?;

    for (_chunk_idx, chunk) in data.rows.chunks(CHUNK_SIZE).enumerate() {
        let chunk_data: Vec<csv_processor::CsvRecord> = chunk
            .iter()
            .map(|row| {
                let mut new_values = Vec::new();
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

        // Emit chunk
         window
            .emit(
                "data-stream-chunk",
                ProcessedData {
                    headers: sensors.clone(),
                    rows: chunk_data,
                },
            )
            .map_err(|e| e.to_string())?;
            
        // Optional: Yield to event loop if needed, but in a command it might not help much unless async.
        // But since this is regular command, it runs on a thread pool (tauri default).
    }

    // Emit end
    window.emit("data-stream-end", {}).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn load_metadata_command(path: String) -> Result<Vec<SensorMetadata>, String> {
    load_metadata(&path)
}

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[tauri::command]
async fn run_python_analysis(app: tauri::AppHandle) -> Result<String, String> {
    // Use mock data for testing
    let data = ProcessedData {
        headers: vec!["Timestamp".to_string(), "SensorA".to_string(), "SensorB".to_string()],
        rows: vec![
            csv_processor::CsvRecord {
                timestamp: Some("2021-01-01T00:00:00Z".to_string()),
                values: vec![None, Some(10.0), Some(20.0)],
            },
            csv_processor::CsvRecord {
                timestamp: Some("2021-01-01T01:00:00Z".to_string()),
                values: vec![None, Some(15.0), Some(25.0)],
            },
            csv_processor::CsvRecord {
                timestamp: Some("2021-01-01T02:00:00Z".to_string()),
                values: vec![None, Some(12.0), Some(22.0)],
            },
        ],
    };
    
    // Serialize data to JSON string
    let json_data = serde_json::to_string(&data).map_err(|e| e.to_string())?;

    // Write to stdin
    println!("Rust: Spawning sidecar...");
    let sidecar_command = app.shell().sidecar("backend").map_err(|e| e.to_string())?;
    let (mut rx, mut child) = sidecar_command.spawn().map_err(|e| e.to_string())?;

    println!("Rust: Writing data to stdin...");
    let mut data_with_newline = json_data.clone();
    data_with_newline.push('\n');
    child.write(data_with_newline.as_bytes()).map_err(|e| e.to_string())?;
    println!("Rust: Data written.");
    
    // Read stdout
    let mut output = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8(line).map_err(|e| e.to_string())?;
                output.push_str(&line_str);
            }
            CommandEvent::Stderr(line) => {
                 let line_str = String::from_utf8(line).map_err(|e| e.to_string())?;
                 println!("Python Error: {}", line_str);
            }
            CommandEvent::Terminated(_) => {
                break;
            }
            _ => {}
        }
    }
    
    Ok(output)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            load_csv,
            get_data,
            load_metadata_command,
            run_python_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
