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

interface StepCardProps {
  step: Step;
  idx: number;
  isActive?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDrawBox?: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({ step, idx, isActive, onEdit, onDelete, onDrawBox }) => {
  const getStepConfig = () => {
    switch (step.action) {
      case 'hook_window':
        return {
          icon: Crosshair,
          color: '#eab308',
          bgColor: 'rgba(234, 179, 8, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.3)',
          title: step.label || 'Hook Target Window',
          subtitle: `Countdown: ${step.delay_seconds ?? 5}s`
        };
      case 'screenshot':
        return {
          icon: Camera,
          color: '#10b981',
          bgColor: 'rgba(165, 243, 206, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          title: step.label || 'Screenshot Evidence',
          subtitle: `Tag: ${step.label || 'capture'}`
        };
      case 'mouse_click':
        return {
          icon: MousePointer2,
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
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
          color: '#64748b',
          bgColor: 'rgba(100, 116, 139, 0.1)',
          borderColor: 'rgba(100, 116, 139, 0.3)',
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
        background: isActive
          ? 'linear-gradient(135deg, #0369a1 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: isActive ? '2px solid #38bdf8' : `1px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '12px',
        position: 'relative',
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)`,
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      {/* Step Number Badge */}
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

      {/* Main Content Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
        {/* Icon */}
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

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {config.title}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {config.subtitle && <span>{config.subtitle}</span>}

            {/* Step-specific details */}
            {step.action === 'hook_window' && (
              <>
                {step.hook_target?.window_title && (
                  <span style={{ color: '#38bdf8' }}>
                    • Target: <b style={{ color: '#e0f2fe' }}>{step.hook_target.window_title}</b>
                  </span>
                )}
                {step.hook_target?.pid && (
                  <span style={{ color: '#cbd5e1' }}>
                    • PID: <b style={{ color: '#f1f5f9' }}>{step.hook_target.pid}</b>
                  </span>
                )}
              </>
            )}

            {step.action === 'mouse_click' && (
              <>
                {step.region && (
                  <span style={{ color: '#cbd5e1' }}>
                    • Relative Offset: <b style={{ color: '#f1f5f9' }}>({step.region.left}, {step.region.top})</b>
                  </span>
                )}
                <span style={{ color: '#cbd5e1' }}>
                  • Button: <b style={{ color: '#f1f5f9' }}>{step.button || 'left'}</b>
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  • Clicks: <b style={{ color: '#f1f5f9' }}>{step.clicks || 1}</b>
                </span>
              </>
            )}

            {step.action === 'screenshot' && (
              <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>
                📸 Evidence capture
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {step.action === 'mouse_click' && onDrawBox && (
            <button
              onClick={onDrawBox}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
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
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Edit3 size={14} color="#cbd5e1" />
          </button>

          <button
            onClick={onDelete}
            title="Delete step"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Trash2 size={14} color="#ef4444" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepCard;
