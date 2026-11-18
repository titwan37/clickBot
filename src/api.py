"""FastAPI and WebSocket bridge connecting ClickBot backend with the Vite UI."""
import os
import json
import logging
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pyautogui as pag

from src.models import Job, Region
from src.engine import WorkflowEngine
from src.region_selector import RegionSelector

# Set up dedicated file and console logging
logs_path = Path("logs")
logs_path.mkdir(parents=True, exist_ok=True)
log_file = logs_path / "clickbot.log"

logger = logging.getLogger("clickbot")
logger.setLevel(logging.INFO)

# File handler
fh = logging.FileHandler(log_file, encoding="utf-8")
fh.setLevel(logging.INFO)
formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
fh.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(fh)

app = FastAPI(title="ClickBot API")

# Catch validation errors and log detail to file and console
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = exc.errors()
    body = await request.body()
    logger.error(f"Validation error on {request.url.path}: {error_details} | Body: {body.decode('utf-8', errors='ignore')}")
    return JSONResponse(
        status_code=422,
        content={"detail": error_details, "message": "Request validation failed"}
    )

# Enable CORS for Vite frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure assets directory exists and mount it for static screenshot viewing
assets_path = Path("assets")
assets_path.mkdir(exist_ok=True)
workflows_path = assets_path / "workflows"
workflows_path.mkdir(exist_ok=True)
evidence_path = Path("evidence")
evidence_path.mkdir(exist_ok=True)

app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/evidence", StaticFiles(directory="evidence"), name="evidence")

engine = WorkflowEngine(evidence_dir=str(evidence_path))
active_connections: List[WebSocket] = []
execution_thread: threading.Thread = None

# WebSocket broadcaster helper
async def broadcast_event(event_type: str, data: dict):
    logger.info(f"Event: {event_type} | Data: {data}")
    payload = json.dumps({"event": event_type, "data": data})
    for conn in list(active_connections):
        try:
            await conn.send_text(payload)
        except Exception:
            if conn in active_connections:
                active_connections.remove(conn)

def sync_event_emitter(loop: asyncio.AbstractEventLoop, event_type: str, data: dict):
    asyncio.run_coroutine_threadsafe(broadcast_event(event_type, data), loop)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_connections)}")
    try:
        # Send an initial connection confirmation event
        await websocket.send_text(json.dumps({
            "event": "connected",
            "data": {"message": "ClickBot telemetry stream connected"}
        }))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(active_connections)}")

@app.get("/api/health")
def health():
    return {"status": "ok", "engine_busy": engine.is_running}

@app.get("/api/screenshot/live")
def get_live_screenshot():
    """Take a live screenshot and return its URL for the canvas editor."""
    shot_info = engine.evidence.capture_screenshot(label="preview")
    return {"url": shot_info["url"], "thumb_url": shot_info["thumb_url"]}

@app.post("/api/calibrate/hotkeys")
def calibrate_hotkeys():
    try:
        region = RegionSelector.from_hotkeys()
        return {"status": "success", "region": region.model_dump()}
    except Exception as e:
        logger.error(f"Error in hotkey calibration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/calibrate/roi")
def calibrate_roi():
    try:
        region = RegionSelector.from_screenshot_roi()
        return {"status": "success", "region": region.model_dump()}
    except Exception as e:
        logger.error(f"Error in ROI calibration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/hook/inspect-active")
def inspect_active_window(delay_seconds: float = 3.0):
    """
    Counts down and hooks the window under mouse pointer to populate
    the studio with window title, PID, browser type, and bounds.
    """
    try:
        info = engine.hooker.hook_under_cursor(delay=delay_seconds)
        return {"status": "success", "window": info}
    except Exception as e:
        logger.error(f"Error inspecting active window: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/jobs/save")
def save_job(job: Job):
    logger.info(f"Saving job: {job.job_id} ({job.name}) with {len(job.steps)} steps")
    file_path = workflows_path / f"{job.job_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(job.model_dump_json(indent=2))
    return {"status": "saved", "path": str(file_path.as_posix())}

@app.get("/api/jobs/list")
def list_jobs():
    jobs = []
    for f in workflows_path.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                jobs.append(json.load(fp))
        except Exception as e:
            logger.warning(f"Failed to read workflow {f}: {e}")
    return {"jobs": jobs}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    file_path = workflows_path / f"{job_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    with open(file_path, "r", encoding="utf-8") as fp:
        return json.load(fp)

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    file_path = workflows_path / f"{job_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")
    file_path.unlink()
    logger.info(f"Deleted workflow: {job_id}")
    return {"status": "deleted", "job_id": job_id}

@app.get("/api/logs")
def get_logs(limit: int = 200):
    """Retrieve recent lines from log file."""
    if not log_file.exists():
        return {"logs": []}
    with open(log_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return {"logs": [line.strip() for line in lines[-limit:]]}

@app.post("/api/jobs/run")
async def run_job(job: Job):
    global execution_thread
    if engine.is_running:
        raise HTTPException(status_code=400, detail="Engine is already running a job.")

    logger.info(f"Starting job execution: {job.job_id} ({job.name})")
    # In an async endpoint, get_running_loop() safely retrieves the main event loop
    loop = asyncio.get_running_loop()

    def run_worker():
        try:
            engine.execute_job(
                job,
                on_event=lambda evt, data: sync_event_emitter(loop, evt, data)
            )
        except Exception as err:
            logger.error(f"Job execution failed: {err}")

    execution_thread = threading.Thread(target=run_worker, daemon=True)
    execution_thread.start()
    return {"status": "started", "job_id": job.job_id}

@app.post("/api/jobs/stop")
async def stop_job():
    logger.info("Stopping running job")
    engine.stop()
    await broadcast_event("job_aborted", {"reason": "User stopped execution via Stop button"})
    return {"status": "stop_requested"}
