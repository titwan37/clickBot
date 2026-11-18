import React from 'react';
import type { LogEvent } from '../types';
import {
  Terminal,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Camera,
  MousePointer,
  Clock,
  Crosshair,
} from 'lucide-react';

interface TelemetryPanelProps {
  logs: LogEvent[];
  isWsConnected: boolean;
  isLogsCollapsed: boolean;
  logsPanelWidth: number;
  isResizing: boolean;
  onToggleCollapse: () => void;
  onStartResizing: () => void;
}

// Helper to format log data into readable text
const formatLogData = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') return data;

  const parts: string[] = [];
  if (data.step_id) parts.push(`Step: ${data.step_id}`);
  if (data.label) parts.push(`Label: ${data.label}`);
  if (data.action) parts.push(`Action: ${data.action.replace('_', ' ')}`);
  if (data.duration_ms) parts.push(`Duration: ${(data.duration_ms / 1000).toFixed(2)}s`);
  if (data.details?.clicked_location) {
    const loc = data.details.clicked_location;
    parts.push(`Click: (${loc.x}, ${loc.y})`);
  }
  if (data.details?.file_path) {
    const fileName = data.details.file_path.split('/').pop();
    parts.push(`File: ${fileName}`);
  }

  return parts.length > 0 ? parts.join(' • ') : JSON.stringify(data);
};

const getEventIcon = (event: string) => {
  if (event.includes('success')) return { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  if (event.includes('failed') || event.includes('error')) return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  if (event.includes('abort')) return { icon: AlertTriangle, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
  return { icon: Info, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' };
};

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  logs,
  isWsConnected,
  isLogsCollapsed,
  logsPanelWidth,
  isResizing,
  onToggleCollapse,
  onStartResizing,
}) => {
  return (
    <>
      {/* Inject CSS for animations and scrollbar */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
        }
        .live-dot { animation: pulse-live 2s infinite; }
        .telemetry-scroll::-webkit-scrollbar { width: 6px; }
        .telemetry-scroll::-webkit-scrollbar-track { background: #0f172a; }
        .telemetry-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .telemetry-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {/* Resizer Handle */}
      <div
        onMouseDown={onStartResizing}
        title={isLogsCollapsed ? 'Logs panel is collapsed' : 'Drag to resize telemetry panel'}
        style={{
          width: 6,
          background: isResizing ? '#38bdf8' : '#1e293b',
          cursor: isLogsCollapsed ? 'default' : 'col-resize',
          transition: 'background 0.15s',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 2, height: 24, background: '#475569', borderRadius: 1 }} />
      </div>

      {/* Main Panel */}
      <div
        style={{
          width: isLogsCollapsed ? 48 : logsPanelWidth,
          background: '#0b1120',
          display: 'flex',
          flexDirection: 'column',
          transition: isResizing ? 'none' : 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
          borderLeft: '1px solid #1e293b',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: isLogsCollapsed ? '12px 8px' : '12px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isLogsCollapsed ? 'center' : 'space-between',
            minHeight: 48,
            boxSizing: 'border-box',
            background: 'rgba(15, 23, 42, 0.8)',
          }}
        >
          {!isLogsCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                    padding: 6,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Terminal size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Execution Logs</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Real-time telemetry</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className={isWsConnected ? 'live-dot' : ''}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isWsConnected ? '#10b981' : '#ef4444',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isWsConnected ? '#10b981' : '#ef4444' }}>
                    {isWsConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <button
                  onClick={onToggleCollapse}
                  title="Collapse Telemetry Panel"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 4,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onToggleCollapse}
              title="Expand Telemetry Panel"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        {!isLogsCollapsed ? (
          <div
            className="telemetry-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {logs.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#475569',
                  textAlign: 'center',
                  padding: '40px 20px',
                }}
              >
                <Terminal size={32} color="#334155" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>No events yet</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Click Run to begin execution</div>
              </div>
            ) : (
              logs.map((log, i) => {
                const { icon: Icon, color, bg } = getEventIcon(log.event);
                const details = log.data?.details;
                const thumbUrl = details?.thumb_url || log.data?.thumb_url;
                const fullUrl = details?.url || log.data?.url;
                const pixelInfo = details?.pixels_around_mouse || details?.window?.pixels_around_mouse;

                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: 10,
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#334155')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
                  >
                    {/* Event Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            background: bg,
                            padding: 4,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={12} color={color} />
                        </div>
                        <span style={{ color: color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {log.event.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: 10 }}>{log.timestamp}</span>
                    </div>

                    {/* Formatted Data */}
                    {log.data && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#cbd5e1',
                          background: 'rgba(15, 23, 42, 0.6)',
                          padding: '6px 8px',
                          borderRadius: 4,
                          border: '1px solid rgba(30, 41, 59, 0.5)',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          lineHeight: 1.4,
                        }}
                      >
                        {formatLogData(log.data)}
                      </div>
                    )}

                    {/* Thumbnail */}
                    {thumbUrl && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href={fullUrl || thumbUrl} target="_blank" rel="noreferrer">
                          <img
                            src={thumbUrl}
                            alt="Screenshot"
                            style={{
                              width: 80,
                              height: 50,
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #334155',
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        </a>
                        <div style={{ fontSize: 10, color: '#64748b', wordBreak: 'break-all', flex: 1 }}>
                          {details?.file_path || 'Screenshot saved'}
                        </div>
                      </div>
                    )}

                    {/* Pixel Info */}
                    {pixelInfo && pixelInfo.hex && (
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(15, 23, 42, 0.8)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid #334155',
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            backgroundColor: pixelInfo.hex,
                            border: '1px solid #475569',
                            boxShadow: `0 0 8px ${pixelInfo.hex}40`,
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>
                            {pixelInfo.hex}
                          </span>
                          <span style={{ color: '#64748b', fontSize: 9 }}>
                            RGB({pixelInfo.rgb?.join(', ')})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: '#64748b',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontWeight: 600,
              padding: 8,
            }}
          >
            LOGS ({logs.length})
          </div>
        )}
      </div>
    </>
  );
};

export default TelemetryPanel;