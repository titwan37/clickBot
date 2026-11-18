import pytest
from src.models import Region, Step, Job
from src.engine import WorkflowEngine

def test_job_and_step_models():
    region = Region(left=100, top=200, width=50, height=30)
    step = Step(step_id="step_1", action="mouse_click", region=region, randomize=True)
    job = Job(job_id="test_job", name="Test Automation", steps=[step])

    assert job.name == "Test Automation"
    assert len(job.steps) == 1
    assert job.steps[0].region.left == 100

def test_workflow_engine_wait_step():
    job = Job(
        job_id="test_wait",
        name="Wait Test",
        iterations=1,
        steps=[
            Step(step_id="s1", action="wait", duration=0.1)
        ]
    )
    events = []
    engine = WorkflowEngine()
    success = engine.execute_job(job, on_event=lambda evt, data: events.append(evt))

    assert success is True
    assert "job_started" in events
    assert "step_success" in events
    assert "job_completed" in events
