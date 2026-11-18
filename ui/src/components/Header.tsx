import React from 'react';
import { MousePointer, FolderOpen, Save, Square, Play, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  isRunning: boolean;
  onOpenLoadModal: () => void;
  onSaveJob: () => void;
  onRunJob: () => void;
  onStopJob: () => void;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning, onOpenLoadModal, onSaveJob, onRunJob, onStopJob, toggleTheme
}) => {
  const { theme } = useTheme();
  const c = theme.colors;

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s ease',
    border: `1px solid ${c.border}`
  };

  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', height: 64,
      background: c.bgSecondary,
      borderBottom: `1px solid ${c.border}`,
      boxShadow: c.shadow,
      zIndex: 50
    }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: `linear-gradient(135deg, ${c.accent}, ${c.info})`,
          padding: 10, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${c.accent}40`
        }}>
          <MousePointer size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: c.textPrimary, letterSpacing: '-0.02em' }}>
            ClickBot Studio
          </div>
          <div style={{ fontSize: 11, color: c.textMuted, fontWeight: 500 }}>
            Professional Workflow Automation
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onOpenLoadModal} style={{ ...btnBase, background: c.bgPrimary, color: c.textSecondary }}>
          <FolderOpen size={15} color={c.info} /> Load
        </button>
        <button onClick={onSaveJob} style={{ ...btnBase, background: c.bgPrimary, color: c.textSecondary }}>
          <Save size={15} color={c.success} /> Save
        </button>
        
        <div style={{ width: 1, height: 24, background: c.border, margin: '0 4px' }} />

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          title={`Switch to ${theme.mode === 'dark' ? 'light' : 'dark'} mode`}
          style={{ 
            ...btnBase, 
            background: 'transparent', 
            border: 'none', 
            padding: 8,
            color: c.textSecondary
          }}
        >
          {theme.mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Run/Stop */}
        {isRunning ? (
          <button onClick={onStopJob} style={{
            ...btnBase, padding: '8px 18px',
            background: `linear-gradient(135deg, ${c.error}, #b91c1c)`,
            border: 'none', color: '#fff',
            boxShadow: `0 4px 12px ${c.error}40`
          }}>
            <Square size={14} fill="#fff" /> Emergency Stop
          </button>
        ) : (
          <button onClick={onRunJob} style={{
            ...btnBase, padding: '8px 20px',
            background: `linear-gradient(135deg, ${c.accent}, ${c.info})`,
            border: 'none', color: '#fff',
            boxShadow: `0 4px 12px ${c.accent}40`
          }}>
            <Play size={14} fill="#fff" /> Run Workflow
          </button>
        )}
      </div>
    </header>
  );
};