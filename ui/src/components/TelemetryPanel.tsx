import React from 'react';
import type { LogEvent } from '../types';
import { Terminal, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TelemetryPanelProps {
  logs: LogEvent[];
  isWsConnected: boolean;
  isLogsCollapsed: boolean;
  logsPanelWidth: number;
  isResizing: boolean;
  onToggleCollapse: () => void;
  onStartResizing: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  logs, isWsConnected, isLogsCollapsed, logsPanelWidth, isResizing,
  onToggleCollapse, onStartResizing
}) => {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <>
      {/* Resizer */}
      <div
        onMouseDown={onStartResizing}
        style={{
          width: 6, background: isResizing ? c.accent : c.border,
          cursor: isLogsCollapsed ? 'default' : 'col-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <div style={{ width: 2, height: 24, background: c.textMuted, borderRadius: 1 }} />
      </div>

      {/* Panel */}
      <div style={{
        width: isLogsCollapsed ? 48 : logsPanelWidth,
        background: c.bgPrimary,
        borderLeft: `1px solid ${c.border}`,
        display: 'flex', flexDirection: 'column',
        transition: isResizing ? 'none' : 'width 0.2s ease',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: isLogsCollapsed ? '12px 8px' : '12px 16px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: isLogsCollapsed ? 'center' : 'space-between',
          background: c.bgSecondary, minHeight: 48
        }}>
          {!isLogsCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: `linear-gradient(135deg, ${c.accent}, ${c.info})`,
                  padding: 6, borderRadius: 6, display: 'flex'
                }}>
                  <Terminal size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>Execution Logs</div>
                  <div style={{ fontSize: 10, color: c.textMuted }}>Real-time telemetry</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: isWsConnected ? c.success : c.error,
                    boxShadow: `0 0 8px ${isWsConnected ? c.success : c.error}80`
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isWsConnected ? c.success : c.error }}>
                    {isWsConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <button onClick={onToggleCollapse} style={{
                  background: 'transparent', border: 'none', color: c.textMuted, cursor: 'pointer'
                }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <button onClick={onToggleCollapse} style={{
              background: 'transparent', border: 'none', color: c.accent, cursor: 'pointer'
            }}>
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        {!isLogsCollapsed ? (
          <div style={{
            flex: 1, overflowY: 'auto', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12
          }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: c.textMuted }}>
                <Terminal size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600 }}>No events yet</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Click Run to begin execution</div>
              </div>
            ) : (
              logs.map((log, i) => {
                const isSuccess = log.event.includes('success');
                const isFail = log.event.includes('failed') || log.event.includes('error');
                const statusColor = isSuccess ? c.success : isFail ? c.error : c.info;
                const StatusIcon = isSuccess ? CheckCircle2 : isFail ? XCircle : Info;

                return (
                  <div key={i} style={{
                    background: c.bgSecondary,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8, padding: 10,
                    borderLeft: `3px solid ${statusColor}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: statusColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                        <StatusIcon size={12} /> {log.event.replace(/_/g, ' ')}
                      </div>
                      <span style={{ color: c.textMuted, fontSize: 10 }}>{log.timestamp}</span>
                    </div>
                    {log.data && (
                      <div style={{
                        color: c.textSecondary, wordBreak: 'break-all',
                        background: c.bgPrimary, padding: 6, borderRadius: 4,
                        border: `1px solid ${c.border}`
                      }}>
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 1)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            color: c.textMuted, fontSize: 11, letterSpacing: '0.1em', fontWeight: 700
          }}>
            LOGS ({logs.length})
          </div>
        )}
      </div>
    </>
  );
};