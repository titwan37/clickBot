"""ClickBot CLI and Service Launcher."""
import sys
import argparse
import uvicorn
from rich.console import Console
from rich.panel import Panel
from src.models import Job, Step, Region
from src.engine import WorkflowEngine
from src.region_selector import RegionSelector

console = Console()

def run_cli_demo():
    console.print(Panel.fit("[bold green]ClickBot — PoC Interactive Runner[/bold green]"))
    console.print("1. Calibrate Click Region via live hotkeys ([cyan]Ctrl+Shift+1 / 2[/cyan])")
    console.print("2. Calibrate Click Region via visual screenshot ROI")
    console.print("3. Run default demo workflow (Hook -> Screenshot -> Click -> Wait -> Screenshot)")
    console.print("4. Start Web API & UI Bridge ([cyan]http://localhost:8000[/cyan])")

    choice = input("\nEnter choice [1-4] (default: 4): ").strip() or "4"

    if choice == "1":
        reg = RegionSelector.from_hotkeys()
        console.print(f"[bold green]Calibrated Region:[/bold green] {reg}")
    elif choice == "2":
        reg = RegionSelector.from_screenshot_roi()
        console.print(f"[bold green]Calibrated Region:[/bold green] {reg}")
    elif choice == "3":
        console.print("[yellow]Running demo workflow on screen center...[/yellow]")
        import pyautogui as pag
        sw, sh = pag.size()
        demo_region = Region(left=sw//2 - 100, top=sh//2 - 50, width=200, height=100)
        
        job = Job(
            job_id="demo_quickstart",
            name="Demo Workflow",
            iterations=1,
            steps=[
                Step(step_id="step_1", action="hook_window", delay_seconds=3),
                Step(step_id="step_2", action="screenshot", label="before_click"),
                Step(step_id="step_3", action="mouse_click", region=demo_region, randomize=True),
                Step(step_id="step_4", action="wait", duration=1.5),
                Step(step_id="step_5", action="screenshot", label="after_click")
            ]
        )
        engine = WorkflowEngine()
        engine.execute_job(job, on_event=lambda evt, data: console.print(f"[[bold cyan]{evt}[/bold cyan]] {data}"))
        console.print("[bold green]Demo finished![/bold green]")
    else:
        console.print("[bold blue]Starting ClickBot FastAPI backend on http://127.0.0.1:8000 ...[/bold blue]")
        uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ClickBot CLI & Server")
    parser.add_argument("--server", action="store_true", help="Launch FastAPI server directly")
    args = parser.parse_args()

    if args.server:
        uvicorn.run("src.api:app", host="127.0.0.1", port=8000)
    else:
        run_cli_demo()
