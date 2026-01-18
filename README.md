# Soothsayer-Wizard Documentation

## Project Overview
Soothsayer-Wizard is a desktop application designed for importing and analyzing sensor data from CSV files. It leverages **Tauri** for a lightweight desktop experience, **React** for a responsive user interface, and a **Python sidecar** for backend data processing capabilities.

## Architecture
*   **Frontend**: React, TypeScript, TailwindCSS, ECharts.
*   **Core**: Rust (Tauri Framework).
*   **Sidecar**: Python (compiled with Nuitka) for data processing tasks.

## Prerequisites
Ensure the following are installed on your system:
1.  **Node.js**: [Download](https://nodejs.org/) (Latest LTS recommended).
2.  **Rust**: [Install via Rustup](https://rustup.rs/).
3.  **Python**: [Download](https://www.python.org/) (3.8 or newer).
4.  **Nuitka**: Required for compiling the Python backend.
    ```bash
    pip install nuitka
    ```
5.  **Build Tools**:
    *   **Windows**: Visual Studio C++ Build Tools.

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository_url>
cd Exploring-data-with-csv
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Compile Python Sidecar
The application expects a compiled binary for the Python backend. You must generate this before running the app.

**Navigate to the `src-tauri` directory:**
```bash
cd src-tauri
```

**Run Nuitka to compile:**
*Note: The output filename must include the target triple (e.g., `-x86_64-pc-windows-msvc` for Windows x64).*

```powershell
python -m nuitka --onefile --standalone --output-dir=bin --output-filename=backend-x86_64-pc-windows-msvc python/backend.py
```

This will create `src-tauri/bin/backend-x86_64-pc-windows-msvc.exe`.

*If you are on a different OS (macOS/Linux), you must adjust the filename suffix in `tauri.conf.json` and the compilation command to match your platform's target triple (e.g., `x86_64-apple-darwin`).*

## Running the Application

**Development Mode:**
```bash
npm run tauri dev
```
This starts the Vite dev server and opens the Tauri window.

**Build for Production:**
```bash
npm run tauri build
```
The output executable will be in `src-tauri/target/release`.

## Application Flow

1.  **Initialization**:
    *   The app launches and initializes the React frontend.
    *   The Rust core sets up the window and prepares the Python sidecar process.

2.  **Import Phase (`ImportScreen`)**:
    *   Users are presented with an interface to select CSV files.
    *   Files are parsed locally to extract headers and preview data.
    *   Users verify the import and proceed.

3.  **Dashboard Phase (`Dashboard`)**:
    *   The main view displays interactive charts (ECharts) of the imported data.
    *   **Filtering**: Users can filter by time range or sensor IDs.

4.  **Data Processing (Sidecar Integration)**:
    *   When complex calculation is needed, the Frontend sends a command to Rust.
    *   Rust passes data/commands to the running Python binary via `sys.stdin`.
    *   The Python binary processes the data (e.g., statistical analysis) and returns JSON via `sys.stdout`.
    *   The result is displayed on the Dashboard.
