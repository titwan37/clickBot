import React, { useRef, useState, useEffect } from 'react';
import type { Region } from '../types';
import { Camera, Check, RefreshCw, X, Crosshair } from 'lucide-react';

interface CanvasRegionPickerProps {
  hookedBounds?: { left: number; top: number; width: number; height: number };
  onSelectRegion: (region: Region) => void;
  onClose: () => void;
}

export const CanvasRegionPicker: React.FC<CanvasRegionPickerProps> = ({ hookedBounds, onSelectRegion, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<Region | null>(null);

  const fetchScreenshot = async () => {
    setImageLoaded(false);
    try {
      const res = await fetch('/api/screenshot/live');
      const data = await res.json();
      const img = new Image();
      img.src = data.url;
      img.onload = () => {
        setImgElement(img);
        setImageLoaded(true);
      };
    } catch (err) {
      console.error('Failed to capture screenshot', err);
    }
  };

  useEffect(() => {
    fetchScreenshot();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !imgElement || !imageLoaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // If hooked window bounds exist, highlight the hooked window area
    if (hookedBounds) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(hookedBounds.left, hookedBounds.top, hookedBounds.width, hookedBounds.height);
      ctx.setLineDash([]);

      ctx.fillStyle = '#eab308';
      ctx.fillRect(hookedBounds.left, Math.max(0, hookedBounds.top - 20), 150, 18);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`Hooked Window (${hookedBounds.width}x${hookedBounds.height})`, hookedBounds.left + 6, Math.max(14, hookedBounds.top - 6));
    }

    // Draw selection rectangle if exists
    if (currentBox) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(currentBox.left, currentBox.top, currentBox.width, currentBox.height);
      ctx.strokeRect(currentBox.left, currentBox.top, currentBox.width, currentBox.height);

      // Show relative position label if window is hooked
      const relX = hookedBounds ? currentBox.left - hookedBounds.left : currentBox.left;
      const relY = hookedBounds ? currentBox.top - hookedBounds.top : currentBox.top;
      const posLabel = hookedBounds
        ? `Rel: (${relX}, ${relY}) [${currentBox.width}x${currentBox.height}]`
        : `(${currentBox.left}, ${currentBox.top}) [${currentBox.width}x${currentBox.height}]`;

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(currentBox.left, Math.max(0, currentBox.top - 22), 175, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(posLabel, currentBox.left + 5, Math.max(15, currentBox.top - 7));
    }
  }, [imgElement, imageLoaded, currentBox, hookedBounds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const left = Math.min(startPos.x, x);
    const top = Math.min(startPos.y, y);
    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);

    setCurrentBox({ left, top, width, height });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleConfirm = () => {
    if (currentBox && currentBox.width > 3 && currentBox.height > 3) {
      if (hookedBounds) {
        // Calculate relative coordinates inside the hooked window
        const relativeRegion: Region = {
          left: currentBox.left - hookedBounds.left,
          top: currentBox.top - hookedBounds.top,
          width: currentBox.width,
          height: currentBox.height,
        };
        onSelectRegion(relativeRegion);
      } else {
        onSelectRegion(currentBox);
      }
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column', zIndex: 100, padding: 16
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: '#1e293b', borderRadius: 8, marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Camera size={20} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: 16 }}>Select Click Region on Screen</span>
          {hookedBounds ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', padding: '3px 8px', borderRadius: 4
            }}>
              <Crosshair size={13} />
              Coordinates will be saved RELATIVE to hooked window origin ({hookedBounds.left}, {hookedBounds.top})
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Click and drag across the target area</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchScreenshot}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh Screen
          </button>
          {currentBox && currentBox.width > 3 && (
            <button
              onClick={handleConfirm}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
                backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600
              }}
            >
              <Check size={16} /> Confirm Region
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', padding: '6px 10px',
              backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
        alignItems: 'center', background: '#090d16', borderRadius: 8, border: '1px solid #334155'
      }}>
        {!imageLoaded ? (
          <div style={{ color: '#94a3b8', fontSize: 15 }}>Capturing screen...</div>
        ) : (
          <canvas
            ref={canvasRef}
            width={imgElement?.naturalWidth || 1920}
            height={imgElement?.naturalHeight || 1080}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              maxWidth: '96%',
              maxHeight: '84vh',
              objectFit: 'contain',
              cursor: 'crosshair',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}
          />
        )}
      </div>
    </div>
  );
};
