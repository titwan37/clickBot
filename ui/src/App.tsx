import { useState, useEffect } from 'react';
import type { Job, Step, ActionType, Region, LogEvent } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { CanvasRegionPicker } from './components/CanvasRegionPicker';
import { WorkflowLoadModal } from './components/WorkflowLoadModal';
import { StepEditModal } from './components/StepEditModal';
import { TelemetryPanel } from './components/TelemetryPanel';
import { StepCard } from './components/StepCard';
import {
  Camera, MousePointer, Clock, Crosshair, Layers, GripVertical
} from 'lucide-react';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const c = theme.colors;

  const [job, setJob] = useState<Job>({
    job_id: 'job_' + Date.now().toString().slice(-4),
    name: 'Sample Click & Evidence Workflow',
    iterations: 1,
    delay_between_iterations: 1.0,
    steps: [
      {
        step_id: 'step_1',
        action: 'hook_window',
        delay_seconds: 3,
      },
      {
        step_id: 'step_2',
        action: 'screenshot',
        label: 'before_click',
      },
      {
        step_id: 'step_3',
        action: 'mouse_click',
        region: { left: 500, top: 400, width: 120, height: 40 },
        randomize: true,
        button: 'left',
        clicks: 1,
      },
      {
        step_id: 'step_4',
        action: 'wait',
        duration: 1.5,
      },
      {
        step_id: 'step_5',
        action: 'screenshot',
        label: 'after_click',
      },
    ],
  });

  const [activeStepIndexForRegion, setActiveStepIndexForRegion] = useState<number | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Resizable & Collapsible panel state
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [logsPanelWidth, setLogsPanelWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 240 && newWidth <= 800) {
        setLogsPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // WebSocket connection for live telemetry with reconnect & direct backend fallback
  useEffect(() => {
    let socket: WebSocket | null = null;
    let isUnmounted = false;

    const connectWs = () => {
      const wsUrl = window.location.port === '5173'
        ? `ws://${window.location.hostname}:8000/ws`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsWsConnected(true);
        console.log('[ClickBot] WebSocket connected to', wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const logEntry: LogEvent = {
            timestamp: new Date().toLocaleTimeString(),
            event: payload.event,
            data: payload.data,
          };
          setLogs((prev) => [logEntry, ...prev.slice(0, 199)]);

          if (payload.event === 'step_started') {
            setActiveStepId(payload.data.step_id);
          } else if (payload.event === 'job_completed' || payload.event === 'job_aborted' || payload.event === 'job_error') {
            setIsRunning(false);
            setActiveStepId(null);
          }
        } catch (err) {
          console.error('WS Parse error', err);
        }
      };

      socket.onclose = () => {
        setIsWsConnected(false);
        if (!isUnmounted) {
          setTimeout(connectWs, 2000);
        }
      };

      socket.onerror = (err) => {
        console.warn('[ClickBot] WS error, will reconnect', err);
        socket?.close();
      };
    };

    connectWs();

    // Fetch initial historical logs on load
    fetch('/api/logs?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data.logs && Array.isArray(data.logs)) {
          const initial: LogEvent[] = data.logs.map((line: string) => ({
            timestamp: line.slice(1, 20) || '',
            event: 'LOG',
            data: line.slice(22),
          })).reverse();
          setLogs((prev) => (prev.length === 0 ? initial : prev));
        }
      })
      .catch(() => { });

    return () => {
      isUnmounted = true;
      socket?.close();
    };
  }, []);

  const addStep = (action: ActionType) => {
    const newStep: Step = {
      step_id: 'step_' + (job.steps.length + 1),
      action,
      duration: action === 'wait' ? 1.5 : undefined,
      label: action === 'screenshot' ? 'state_' + (job.steps.length + 1) : undefined,
      delay_seconds: action === 'hook_window' ? 3 : undefined,
      region: action === 'mouse_click' ? { left: 400, top: 300, width: 100, height: 40 } : undefined,
      randomize: true,
      button: 'left',
      clicks: 1,
    };
    setJob((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const removeStep = (index: number) => {
    setJob((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index: number, updates: Partial<Step>) => {
    setJob((prev) => {
      const nextSteps = [...prev.steps];
      nextSteps[index] = { ...nextSteps[index], ...updates };
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRunJob = async () => {
    setIsRunning(true);
    setLogs([]);
    try {
      const res = await fetch('/api/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      if (!res.ok) {
        const error = await res.json();
        const msg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
        alert('Failed to start job: ' + msg);
        setIsRunning(false);
      }
    } catch (err) {
      alert('Error running job: ' + err);
      setIsRunning(false);
    }
  };

  const handleStopJob = async () => {
    setIsRunning(false);
    setActiveStepId(null);
    try {
      await fetch('/api/jobs/stop', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveJob = async () => {
    try {
      const res = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      if (res.ok) {
        alert('Workflow saved successfully: assets/workflows/' + job.job_id + '.json');
      } else {
        const error = await res.json();
        const msg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
        alert('Failed to save job: ' + msg);
      }
    } catch (err) {
      alert('Error saving job: ' + err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: c.bgPrimary,
      color: c.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      {/* Top Header */}
      <Header
        isRunning={isRunning}
        onOpenLoadModal={() => setIsLoadModalOpen(true)}
        onSaveJob={handleSaveJob}
        onRunJob={handleRunJob}
        onStopJob={handleStopJob}
        toggleTheme={toggleTheme}
      />

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Workflow Builder */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Job Config bar */}
          <div style={{
            background: c.bgSecondary,
            padding: '16px 20px',
            borderRadius: 12,
            border: `1px solid ${c.border}`,
            boxShadow: c.shadow,
            display: 'flex',
            gap: 20,
            alignItems: 'center'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: c.textMuted, display: 'block', marginBottom: 4 }}>Job Name</label>
              <input
                type="text"
                value={job.name}
                onChange={(e) => setJob({ ...job, name: e.target.value })}
                style={{
                  width: '100%',
                  background: c.bgPrimary,
                  border: `1px solid ${c.border}`,
                  padding: '6px 10px',
                  borderRadius: 6,
                  color: c.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: 12, color: c.textMuted, display: 'block', marginBottom: 4 }}>Iterations</label>
              <input
                type="number"
                min={1}
                value={job.iterations}
                onChange={(e) => setJob({ ...job, iterations: parseInt(e.target.value) || 1 })}
                style={{
                  width: '100%',
                  background: c.bgPrimary,
                  border: `1px solid ${c.border}`,
                  padding: '6px 10px',
                  borderRadius: 6,
                  color: c.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Master Toolbox (Drag & Drop or Click to add) */}
          <div style={{
            background: c.bgSecondary,
            border: `1px solid ${c.border}`,
            borderRadius: 12,
            padding: '14px 18px',
            boxShadow: c.shadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} /> Action Master Toolbox
              </div>
              <div style={{ fontSize: 11, color: c.textMuted }}>
                Drag masters into the canvas or click to add
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Master 1: Hook Window */}
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/action', 'hook_window')}
                onClick={() => addStep('hook_window')}
                style={{
                  background: c.bgPrimary,
                  border: `1px dashed ${c.warning}`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <GripVertical size={14} color={c.textMuted} />
                <Crosshair size={16} color={c.warning} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Hook Target Window</div>
                  <div style={{ fontSize: 10, color: c.textMuted }}>Target browser title & PID</div>
                </div>
              </div>

              {/* Master 2: Mouse Click */}
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/action', 'mouse_click')}
                onClick={() => addStep('mouse_click')}
                style={{
                  background: c.bgPrimary,
                  border: `1px dashed ${c.accent}`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <GripVertical size={14} color={c.textMuted} />
                <MousePointer size={16} color={c.accent} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Mouse Click</div>
                  <div style={{ fontSize: 10, color: c.textMuted }}>Regional jitter & pixel inspect</div>
                </div>
              </div>

              {/* Master 3: Wait Delay */}
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/action', 'wait')}
                onClick={() => addStep('wait')}
                style={{
                  background: c.bgPrimary,
                  border: '1px dashed #a855f7',
                  borderRadius: 8,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <GripVertical size={14} color={c.textMuted} />
                <Clock size={16} color="#a855f7" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Wait Delay</div>
                  <div style={{ fontSize: 10, color: c.textMuted }}>Interruptible pause</div>
                </div>
              </div>

              {/* Master 4: Screenshot Evidence */}
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/action', 'screenshot')}
                onClick={() => addStep('screenshot')}
                style={{
                  background: c.bgPrimary,
                  border: `1px dashed ${c.success}`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <GripVertical size={14} color={c.textMuted} />
                <Camera size={16} color={c.success} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>Screenshot</div>
                  <div style={{ fontSize: 10, color: c.textMuted }}>Evidence & thumbnail</div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Canvas Area (Drop Zone) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const action = e.dataTransfer.getData('text/action') as ActionType;
              if (action) {
                addStep(action);
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
              background: c.bgSecondary,
              border: `2px dashed ${c.border}`,
              borderRadius: 12,
              padding: 18,
              minHeight: 300,
              boxShadow: c.shadow
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: c.textPrimary }}>
                  <Layers size={18} color={c.accent} /> Workflow Canvas Pipeline ({job.steps.length} steps)
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                  💡 <span style={{ color: c.accent, fontWeight: 600 }}>Double-click any step</span> to edit parameters (browser title, PID, countdown, clicks)
                </div>
              </div>
            </div>

            {job.steps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: c.textMuted }}>
                <Layers size={36} color={c.textMuted} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: c.textSecondary }}>Canvas is Empty</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Drag action masters from the toolbox above or click them to assemble your job.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {job.steps.map((step, idx) => (
                  <StepCard
                    key={step.step_id}
                    step={step}
                    idx={idx}
                    isActive={activeStepId === step.step_id}
                    onEdit={() => setEditingStepIndex(idx)}
                    onDelete={() => removeStep(idx)}
                    onDrawBox={step.action === 'mouse_click' ? () => setActiveStepIndexForRegion(idx) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Telemetry & Live Logs (Extracted Component) */}
        <TelemetryPanel
          logs={logs}
          isWsConnected={isWsConnected}
          isLogsCollapsed={isLogsCollapsed}
          logsPanelWidth={logsPanelWidth}
          isResizing={isResizing}
          onToggleCollapse={() => setIsLogsCollapsed(!isLogsCollapsed)}
          onStartResizing={() => {
            if (!isLogsCollapsed) setIsResizing(true);
          }}
        />
      </div>

      {/* Visual Canvas Region Picker Overlay */}
      {activeStepIndexForRegion !== null && (
        <CanvasRegionPicker
          onSelectRegion={(region: Region) => {
            updateStep(activeStepIndexForRegion, { region });
          }}
          onClose={() => setActiveStepIndexForRegion(null)}
        />
      )}

      {/* Step Edit Modal (Label & Countdown/Delay) */}
      {editingStepIndex !== null && job.steps[editingStepIndex] && (
        <StepEditModal
          index={editingStepIndex}
          step={job.steps[editingStepIndex]}
          onSave={(updates: Partial<Step>) => {
            updateStep(editingStepIndex, updates);
          }}
          onClose={() => setEditingStepIndex(null)}
        />
      )}

      {/* Workflow Load Modal */}
      {isLoadModalOpen && (
        <WorkflowLoadModal
          onLoadJob={(loadedJob: Job) => {
            setJob(loadedJob);
          }}
          onClose={() => setIsLoadModalOpen(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
