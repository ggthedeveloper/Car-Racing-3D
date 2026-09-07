import React, { useRef, useEffect } from 'react';

export function Minimap({ trackData, playerPos, playerYaw, aiPositions = [], trafficPositions = [] }) {
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const coordsRef = useRef(null);

  // 1. Pre-render static track layout when trackData changes
  useEffect(() => {
    if (!trackData || !trackData.samples || trackData.samples.length === 0) return;

    const width = 180;
    const height = 180;
    const padding = 16;
    const samples = trackData.samples;

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i].position;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeZ);

    const toCanvasX = (wx) => width * 0.5 + (wx - (minX + maxX) * 0.5) * scale;
    const toCanvasY = (wz) => height * 0.5 + (wz - (minZ + maxZ) * 0.5) * scale;
    coordsRef.current = { toCanvasX, toCanvasY };

    // Offscreen background canvas
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d');

    // Draw track path background
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    bgCtx.lineWidth = 6;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    bgCtx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const cx = toCanvasX(samples[i].position.x);
      const cy = toCanvasY(samples[i].position.z);
      if (i === 0) bgCtx.moveTo(cx, cy);
      else bgCtx.lineTo(cx, cy);
    }
    bgCtx.closePath();
    bgCtx.stroke();

    // Inner glowing track line
    bgCtx.strokeStyle = '#00e5ff';
    bgCtx.lineWidth = 2.5;
    bgCtx.stroke();

    // Start / Finish Line marker
    const startX = toCanvasX(samples[0].position.x);
    const startY = toCanvasY(samples[0].position.z);
    bgCtx.fillStyle = '#ffffff';
    bgCtx.beginPath();
    bgCtx.arc(startX, startY, 4, 0, Math.PI * 2);
    bgCtx.fill();

    bgCanvasRef.current = bgCanvas;
  }, [trackData]);

  // 2. High-performance dynamic dot/arrow render per frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgCanvasRef.current || !coordsRef.current) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Blit pre-rendered track background
    ctx.drawImage(bgCanvasRef.current, 0, 0);

    const { toCanvasX, toCanvasY } = coordsRef.current;

    // Draw civilian traffic dots (silver/white)
    if (trafficPositions && trafficPositions.length > 0) {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      for (let i = 0; i < trafficPositions.length; i++) {
        const tr = trafficPositions[i];
        if (!tr.position) continue;
        const tx = toCanvasX(tr.position.x);
        const ty = toCanvasY(tr.position.z);
        ctx.beginPath();
        ctx.arc(tx, ty, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw AI opponent dots (red)
    for (let i = 0; i < aiPositions.length; i++) {
      const ai = aiPositions[i];
      if (!ai.position) continue;
      const ax = toCanvasX(ai.position.x);
      const ay = toCanvasY(ai.position.z);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player Arrow
    if (playerPos) {
      const px = toCanvasX(playerPos.x);
      const py = toCanvasY(playerPos.z);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(playerYaw || 0);

      // Arrow triangle
      ctx.fillStyle = '#00ff88';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(-5, -6);
      ctx.lineTo(0, -3);
      ctx.lineTo(5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }, [playerPos, playerYaw, aiPositions, trafficPositions]);

  return (
    <div className="minimap-container">
      <canvas ref={canvasRef} width={180} height={180} className="minimap-canvas" />
    </div>
  );
}
