/**
 * SpeedLinesSystem: High-performance 2D Canvas speed warp lines overlay
 * Provides an Asphalt-inspired speed sensation when exceeding 210 km/h or triggering Nitro.
 */
export class SpeedLinesSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.lines = [];
    this.maxLines = 45;
    this.intensity = 0;

    for (let i = 0; i < this.maxLines; i++) {
      this.lines.push(this.createLine());
    }
  }

  createLine() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.25 + Math.random() * 0.55;
    const length = 0.12 + Math.random() * 0.28;
    const speed = 1.2 + Math.random() * 2.0;
    const width = 1.0 + Math.random() * 2.5;

    return { angle, dist, length, speed, width };
  }

  update(dt, speedKmh, nitroTier = 0) {
    if (!this.canvas || !this.ctx) return;

    // Target intensity based on speed and nitro tier
    let targetIntensity = 0;
    if (nitroTier === 2) {
      targetIntensity = 1.0;
    } else if (nitroTier === 1) {
      targetIntensity = 0.75;
    } else if (speedKmh > 210) {
      targetIntensity = Math.min(0.65, (speedKmh - 210) / 100);
    }

    // Smooth intensity transition
    this.intensity += (targetIntensity - this.intensity) * Math.min(1.0, dt * 8);

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    if (this.intensity < 0.02) return;

    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);

    // Color: Cyan for high speed / Tier 1; Electric Magenta/Purple for Perfect Nitro
    const strokeStyle = nitroTier === 2
      ? `rgba(217, 70, 239, ${0.45 * this.intensity})`
      : `rgba(125, 211, 252, ${0.38 * this.intensity})` ;

    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      l.dist += l.speed * dt * (1.0 + this.intensity * 1.5);

      if (l.dist > 1.1) {
        l.dist = 0.25 + Math.random() * 0.2;
        l.angle = Math.random() * Math.PI * 2;
      }

      const r1 = l.dist * maxRadius;
      const r2 = (l.dist + l.length * this.intensity) * maxRadius;

      const x1 = cx + Math.cos(l.angle) * r1;
      const y1 = cy + Math.sin(l.angle) * r1;
      const x2 = cx + Math.cos(l.angle) * r2;
      const y2 = cy + Math.sin(l.angle) * r2;

      this.ctx.lineWidth = l.width * (0.8 + this.intensity * 0.8);
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  resize(width, height) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
