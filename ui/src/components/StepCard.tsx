import React from 'react';
import type { Step } from '../types';
import { Crosshair, Camera, MousePointer2, Clock, Edit3, Trash2, Square } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface StepCardProps {
  step: Step;
  idx: number;
  isActive?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDrawBox?: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({ step, idx, isActive, onEdit, onDelete, onDrawBox }) => {
  const { theme } = useTheme();
  const c = theme.colors;

  const getStepConfig = () => {
    switch (step.action) {
      case 'hook_window': return { icon: Crosshair, color: c.warning, title: 'Hook Target Window' };
      case 'screenshot': return { icon: Camera, color: c.success, title: 'Screenshot Evidence' };
      case 'mouse_click': return { icon: MousePointer2, color: c.info, title: 'Mouse Click' };
      case 'wait': return { icon: Clock, color: '#a855f7', title: 'Wait Delay' };
      default: return { icon: Clock, color: c.textMuted, title: step.action };
    }
  };

  const config = getStepConfig();
  const IconComponent = config.icon;

  return (
    <div
      onDoubleClick={onEdit}
      style={{
        background: isActive ? `${c.accent}15` : c.bgSecondary,
        border: `1px solid ${isActive ? c.accent : c.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        position: 'relative',
        boxShadow: isActive ? `0 0 0 1px ${c.accent}, ${c.shadow}` : c.shadow,
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = c.borderLight; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = c.border; }}
    >
      {/* Badge */}
      <div style={{
        position: 'absolute', top: -10, left: 20,
        background: config.color, color: '#fff',
        fontSize: 11, fontWeight: 800, padding: '2px 8px',
        borderRadius: 12, boxShadow: c.shadow
      }}>
        #{idx + 1}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${config.color}15`,
          border: `1px solid ${config.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <IconComponent size={20} color={config.color} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginBottom: 4 }}>
            {config.title}
          </div>
          <div style={{ fontSize: 12, color: c.textSecondary, display: 'flex', gap: 12 }}>
            {step.action === 'mouse_click' && step.region && (
              <span>Region: {step.region.width}×{step.region.height}px</span>
            )}
            {step.action === 'wait' && <span>Duration: {step.duration}s</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          {step.action === 'mouse_click' && onDrawBox && (
            <button onClick={onDrawBox} style={{
              background: c.info, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
            }}>
              <Square size={14} /> Draw Box
            </button>
          )}
          <button onClick={onEdit} style={{
            background: c.bgTertiary, border: `1px solid ${c.border}`,
            borderRadius: 8, padding: 8, cursor: 'pointer', color: c.textSecondary
          }}>
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete} style={{
            background: `${c.error}15`, border: `1px solid ${c.error}40`,
            borderRadius: 8, padding: 8, cursor: 'pointer', color: c.error
          }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};