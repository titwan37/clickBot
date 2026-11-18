# ClickBot — Quick Start Guide

## 1. Architecture Overview

- **Backend**: Python 3 (FastAPI + WebSocket + PyAutoGUI + PyGetWindow + OpenCV)
- **Frontend**: Vite + React + TypeScript + Lucide Icons + HTML5 Canvas
- **Evidence Storage**: `assets/evidence/`
- **Saved Workflows**: `assets/workflows/`

---

## 2. Launching ClickBot

### Option A: Web UI Studio (Recommended)

1. **Start the Backend API Server**:
   ```bash
   cd c:\Dev\clickBot
   python main.py --server
   ```
   *The FastAPI server runs on `http://127.0.0.1:8000` with WebSocket telemetry.*

2. **Start the Vite UI**:
   ```bash
   cd c:\Dev\clickBot\ui
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

### Option B: Interactive CLI Runner
```bash
cd c:\Dev\clickBot
python main.py
```
Provides quick terminal shortcuts to:
1. Calibrate a click region via live browser hotkeys (`Ctrl+Shift+1` & `Ctrl+Shift+2`).
2. Calibrate a click region via OpenCV screenshot ROI drag-and-drop.
3. Run a quick demo workflow.

---

## 3. Using the Vite UI Studio

1. **Configure Steps**:
   - Add actions to your pipeline: **Hook Window**, **Mouse Click**, **Wait Delay**, or **Screenshot**.
   - Reorder or adjust durations and repetition cycles.
2. **Visual Region Selector (HTML5 Canvas)**:
   - On any **Mouse Click** step, click **"Draw Region Box"**.
   - A live screenshot of your active desktop/browser is rendered in high-res.
   - Click and drag crosshairs over the target button or area to automatically set coordinates.
3. **Execution & Live Telemetry**:
   - Click **Run Workflow** to launch the job.
   - Watch step transitions and coordinates streaming live in the right-hand terminal panel.
   - Hit **Emergency Stop** or move your mouse to any screen corner at any time to abort immediately.
