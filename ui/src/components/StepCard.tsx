import React from 'react';
import type { Step } from '../types';
import {
  Crosshair,
  Camera,
  MousePointer2,
  Clock,
  Edit3,
  Trash2,
  Square,
  Hash
} from 'lucide-react';
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
      case 'hook_window':
        return {
          icon: Crosshair,
          color: c.warning,
          bgColor: `${c.warning}15`,
          borderColor: `${c.warning}40`,
          title: step.label || 'Hook Target Window',
          subtitle: `Countdown: ${step.delay_seconds ?? 5}s`
        };
      case 'screenshot':
        return {
          icon: Camera,
          color: c.success,
          bgColor: `${c.success}15`,
          borderColor: `${c.success}40`,
          title: step.label || 'Screenshot Evidence',
          subtitle: `Tag: ${step.label || 'capture'}`
        };
      case 'mouse_click':
        return {
          icon: MousePointer2,
          color: c.info,
          bgColor: `${c.info}15`,
          borderColor: `${c.info}40`,
          title: step.label || 'Mouse Click',
          subtitle: step.region ? `${step.region.width}×${step.region.height}px` : 'Region unset'
        };
      case 'wait':
        return {
          icon: Clock,
          color: '#a855f7',
          bgColor: 'rgba(168, 85, 247, 0.1)',
          borderColor: 'rgba(168, 85, 247, 0.3)',
          title: step.label || 'Wait Delay',
          subtitle: `${step.duration_range?.[0] || step.duration || 1}s pause`
        };
      default:
        return {
          icon: Hash,
          color: c.textMuted,
          bgColor: `${c.textMuted}15`,
          borderColor: `${c.textMuted}40`,
          title: step.action,
          subtitle: ''
        };
    }
  };

  const config = getStepConfig();
  const IconComponent = config.icon;

  return (
    <div
      onDoubleClick={onEdit}
      style={{
        background: isActive ? `${c.accent}10` : c.bgSecondary,
        border: isActive ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '12px',
        position: 'relative',
        boxShadow: isActive ? `0 0 0 1px ${c.accent}, ${c.shadow}` : c.shadow,
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          left: '20px',
          background: config.color,
          color: '#0f172a',
          fontSize: '11px',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '12px',
          boxShadow: `0 2px 4px rgba(0, 0, 0, 0.3)`
        }}
      >
        #{idx + 1}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: config.bgColor,
            border: `1px solid ${config.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <IconComponent size={20} color={config.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: c.textPrimary, marginBottom: '4px' }}>
            {config.title}
          </div>
          <div style={{ fontSize: '12px', color: c.textSecondary, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {config.subtitle && <span>{config.subtitle}</span>}
            
            {step.action === 'hook_window' && (
              <>
                {step.hook_target?.window_title && (
                  <span style={{ color: c.accent }}>
                    • Target: <b style={{ color: c.textPrimary }}>{step.hook_target.window_title}</b>
                  </span>
                )}
                {step.hook_target?.pid && (
                  <span style={{ color: c.textSecondary }}>
                    • PID: <b style={{ color: c.textPrimary }}>{step.hook_target.pid}</b>
                  </span>
                )}
              </>
            )}

            {step.action === 'mouse_click' && (
              <>
                {step.region && (
                  <span style={{ color: c.textSecondary }}>
                    • Relative Offset: <b style={{ color: c.textPrimary }}>({step.region.left}, {step.region.top})</b>
                  </span>
                )}
                <span style={{ color: c.textSecondary }}>
                  • Button: <b style={{ color: c.textPrimary }}>{step.button || 'left'}</b>
                </span>
                <span style={{ color: c.textSecondary }}>
                  • Clicks: <b style={{ color: c.textPrimary }}>{step.clicks || 1}</b>
                </span>
              </>
            )}

            {step.action === 'screenshot' && (
              <span style={{ color: c.success, fontSize: '11px', fontWeight: 600 }}>
                📸 Evidence capture
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {step.action === 'mouse_click' && onDrawBox && (
            <button
              onClick={onDrawBox}
              style={{
                background: c.info,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 2px 4px ${c.info}40`,
                transition: 'all 0.2s ease'
              }}
            >
              <Square size={14} />
              Draw Box
            </button>
          )}
          <button
            onClick={onEdit}
            title="Edit step parameters"
            style={{
              background: c.bgTertiary,
              border: `1px solid ${c.border}`,
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <Edit3 size={14} color={c.textSecondary} />
          </button>
          <button
            onClick={onDelete}
            title="Delete step"
            style={{
              background: `${c.error}15`,
              border: `1px solid ${c.error}40`,
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <Trash2 size={14} color={c.error} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepCard;