import React, { useState, useEffect } from 'react';
import type { Step, HookTarget } from '../types';
import {
  X, Check, Clock, Tag, Crosshair, MousePointer,
  Camera, Globe, RefreshCw
} from 'lucide-react';

interface StepEditModalProps {
  step: Step;
  index: number;
  onSave: (updates: Partial<Step>) => void;
  onClose: () => void;
}

export const StepEditModal: React.FC<StepEditModalProps> = ({ step, index, onSave, onClose }) => {
  const [label, setLabel] = useState(step.label || '');
  const initialSeconds = step.delay_seconds !== undefined
    ? step.delay_seconds
    : step.duration !== undefined
      ? step.duration
      : 3;
  const [countdown, setCountdown] = useState<number>(initialSeconds);

  // Mouse Click params
  const [clicks, setClicks] = useState<number>(step.clicks || 1);
  const [button, setButton] = useState<'left' | 'right' | 'middle'>(step.button || 'left');
  const [randomize, setRandomize] = useState<boolean>(step.randomize ?? true);

  // Hook Window Target params
  const [hookTarget, setHookTarget] = useState<HookTarget>(step.hook_target || {
    window_title: '',
    browser_type: '',
    process_name: '',
    pid: undefined,
    auto_find_by_title: true,
  });
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionCountdown, setInspectionCountdown] = useState<number | null>(null);

  // Live countdown timer in UI
  useEffect(() => {
    if (inspectionCountdown === null) return;
    if (inspectionCountdown <= 0) {
      setInspectionCountdown(null);
      return;
    }
    const timer = setInterval(() => {
      setInspectionCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [inspectionCountdown]);

  const handleInspectWindow = async () => {
    const delaySec = Math.max(1, Math.round(Number(countdown) || 3));
    setIsInspecting(true);
    setInspectionCountdown(delaySec);

    try {
      const res = await fetch(`/api/hook/inspect-active?delay_seconds=${delaySec}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const win = data.window;
        setHookTarget({
          window_title: win.title || '',
          browser_type: win.browser_type || 'Unknown Browser',
          process_name: win.process_name || '',
          pid: win.pid || undefined,
          auto_find_by_title: true,
        });
      } else {
        alert('Server returned error. Please ensure the backend server was restarted with the latest endpoints.');
      }
    } catch (err) {
      alert('Error inspecting window: ' + err);
    } finally {
      setIsInspecting(false);
      setInspectionCountdown(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim() || step.action;
    const cleanSeconds = Math.max(0.1, Number(countdown) || 1.0);

    const updates: Partial<Step> = {
      label: cleanLabel,
    };

    if (step.action === 'hook_window') {
      updates.delay_seconds = cleanSeconds;
      updates.hook_target = hookTarget;
    } else if (step.action === 'wait') {
      updates.duration = cleanSeconds;
    } else if (step.action === 'mouse_click') {
      updates.clicks = Number(clicks) || 1;
      updates.button = button;
      updates.randomize = randomize;
      updates.delay_seconds = cleanSeconds;
    } else if (step.action === 'screenshot') {
      updates.delay_seconds = cleanSeconds;
    }

    onSave(updates);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.78)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120
    }}>
      <div style={{
        background: '#131c31', border: '1px solid #334155', borderRadius: 12,
        width: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        {/* ----------------- Header ---------------------------*/}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#0284c7', padding: 7, borderRadius: 8 }}>
              {step.action === 'hook_window' ? <Crosshair size={18} color="#fff" /> :
                step.action === 'mouse_click' ? <MousePointer size={18} color="#fff" /> :
                  step.action === 'screenshot' ? <Camera size={18} color="#fff" /> :
                    <Clock size={18} color="#fff" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>
                Edit Step #{index + 1}: {step.action.replace('_', ' ').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Configure step execution parameters</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Label Field */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              fontWeight: 600, color: '#cbd5e1', marginBottom: 6
            }}>
              <Tag size={14} color="#38bdf8" /> Step Label / Identifier
            </label>
            <input
              type="text"
              value={label}
              placeholder={`e.g. ${step.action}_custom_label`}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                width: '100%', background: '#090d16', border: '1px solid #334155',
                padding: '8px 12px', borderRadius: 6, color: '#f8fafc', fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Countdown / Delay field */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              fontWeight: 600, color: '#cbd5e1', marginBottom: 6
            }}>
              <Clock size={14} color="#eab308" />
              {step.action === 'hook_window' ? 'Countdown to Hook (seconds)' :
                step.action === 'wait' ? 'Wait Duration (seconds)' : 'Pre-action Delay (seconds)'}
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={countdown}
              onChange={(e) => setCountdown(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%', background: '#090d16', border: '1px solid #334155',
                padding: '8px 12px', borderRadius: 6, color: '#f8fafc', fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Hook Window Specific: Record Page Title, Browser Type & PID */}
          {step.action === 'hook_window' && (
            <div style={{
              background: '#090d16', border: '1px solid #1e293b', borderRadius: 8,
              padding: 14, display: 'flex', flexDirection: 'column', gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={15} /> Target Browser & Window Profile
                </span>
                <button
                  type="button"
                  onClick={handleInspectWindow}
                  disabled={isInspecting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: isInspecting ? '#eab308' : '#0284c7', color: '#fff',
                    border: 'none', borderRadius: 5, cursor: isInspecting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700
                  }}
                >
                  <RefreshCw size={13} />
                  {isInspecting
                    ? `Place mouse on browser! Hooking in ${inspectionCountdown ?? countdown}s...`
                    : 'Capture Window Under Cursor'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  Page / Window Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Boozt.com - Google Chrome"
                  value={hookTarget.window_title || ''}
                  onChange={(e) => setHookTarget({ ...hookTarget, window_title: e.target.value })}
                  style={{
                    width: '100%', background: '#131c31', border: '1px solid #334155',
                    padding: '6px 10px', borderRadius: 4, color: '#f8fafc', fontSize: 13, boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Navigator / Browser Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Google Chrome, Edge"
                    value={hookTarget.browser_type || ''}
                    onChange={(e) => setHookTarget({ ...hookTarget, browser_type: e.target.value })}
                    style={{
                      width: '100%', background: '#131c31', border: '1px solid #334155',
                      padding: '6px 10px', borderRadius: 4, color: '#f8fafc', fontSize: 13, boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    Process PID
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5840"
                    value={hookTarget.pid || ''}
                    onChange={(e) => setHookTarget({ ...hookTarget, pid: parseInt(e.target.value) || undefined })}
                    style={{
                      width: '100%', background: '#131c31', border: '1px solid #334155',
                      padding: '6px 10px', borderRadius: 4, color: '#f8fafc', fontSize: 13, boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={hookTarget.auto_find_by_title ?? true}
                  onChange={(e) => setHookTarget({ ...hookTarget, auto_find_by_title: e.target.checked })}
                />
                Auto-find and focus this window at execution time
              </label>
            </div>
          )}

          {/* Mouse Click Parameters */}
          {step.action === 'mouse_click' && (
            <div style={{
              background: '#090d16', border: '1px solid #1e293b', borderRadius: 8,
              padding: 14, display: 'flex', flexDirection: 'column', gap: 12
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MousePointer size={15} /> Click Behaviour
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Mouse Button</label>
                  <select
                    value={button}
                    onChange={(e) => setButton(e.target.value as any)}
                    style={{
                      width: '100%', background: '#131c31', border: '1px solid #334155',
                      padding: '6px 10px', borderRadius: 4, color: '#f8fafc', fontSize: 13
                    }}
                  >
                    <option value="left">Left Click</option>
                    <option value="right">Right Click</option>
                    <option value="middle">Middle Click</option>
                  </select>
                </div>
                <div style={{ width: 100 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Click Count</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={clicks}
                    onChange={(e) => setClicks(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%', background: '#131c31', border: '1px solid #334155',
                      padding: '6px 10px', borderRadius: 4, color: '#f8fafc', fontSize: 13, boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={randomize}
                  onChange={(e) => setRandomize(e.target.checked)}
                />
                Randomize coordinate jitter inside bounding region (anti-bot)
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px', background: '#1e293b', border: '1px solid #334155',
                color: '#cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: 13
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                background: '#0284c7', border: 'none', color: '#fff', borderRadius: 6,
                cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}
            >
              <Check size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
