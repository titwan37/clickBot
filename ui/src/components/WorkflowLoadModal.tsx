import React, { useState, useEffect } from 'react';
import type { Job } from '../types';
import { FolderOpen, X, Check, Trash2, Calendar, Layers } from 'lucide-react';

interface WorkflowLoadModalProps {
  onLoadJob: (job: Job) => void;
  onClose: () => void;
}

export const WorkflowLoadModal: React.FC<WorkflowLoadModalProps> = ({ onLoadJob, onClose }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs/list');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      } else {
        setError('Failed to fetch workflows.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete workflow "${jobId}"?`)) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      } else {
        alert('Failed to delete workflow.');
      }
    } catch (err) {
      alert('Error deleting workflow');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120
    }}>
      <div style={{
        background: '#131c31', border: '1px solid #334155', borderRadius: 10,
        width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)', overflow: 'hidden'
      }}>
        {/* ----------------------- Header ------------------------------- */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#0284c7', padding: 6, borderRadius: 6 }}>
              <FolderOpen size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#f8fafc' }}>
                Load Saved Workflow
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Stored in assets/workflows/
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 14 }}>
              Loading workflows...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b', fontSize: 14 }}>
              No saved workflows found in assets/workflows.
            </div>
          ) : (
            jobs.map((j) => (
              <div
                key={j.job_id}
                onClick={() => {
                  onLoadJob(j);
                  onClose();
                }}
                style={{
                  background: '#090d16', border: '1px solid #1e293b', borderRadius: 8,
                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc' }}>{j.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, display: 'flex', gap: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Layers size={13} color="#38bdf8" /> {j.steps?.length || 0} steps
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} color="#a855f7" /> Iterations: {j.iterations || 1}
                    </span>
                    <span>ID: <code style={{ color: '#cbd5e1' }}>{j.job_id}</code></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={(e) => handleDelete(j.job_id, e)}
                    title="Delete workflow"
                    style={{
                      background: 'transparent', border: 'none', color: '#64748b',
                      cursor: 'pointer', padding: 6, borderRadius: 4
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                      background: '#0284c7', border: 'none', color: '#fff', borderRadius: 6,
                      fontSize: 12, fontWeight: 600, pointerEvents: 'none'
                    }}
                  >
                    <Check size={14} /> Load
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
