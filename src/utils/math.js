import * as THREE from 'three';

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export const lerp = (a, b, t) => a + (b - a) * t;

export const damp = (current, target, lambda, dt) => {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
};

export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
};

export const degToRad = (deg) => (deg * Math.PI) / 180;
export const radToDeg = (rad) => (rad * 180) / Math.PI;

export const normalizeAngle = (rad) => {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

export const formatSpeed = (speedMs, unit = 'kmh') => {
  if (unit === 'mph') {
    return Math.round(speedMs * 2.23694);
  }
  return Math.round(speedMs * 3.6);
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US').format(Math.round(val));
};

/**
 * Creates an evenly sampled set of points along a 3D CatmullRom curve,
 * along with forward tangents, normals, and cumulative arc lengths.
 */
export function sampleTrackCurve(points, sampleCount = 400) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const spacedPoints = curve.getSpacedPoints(sampleCount);
  const samples = [];
  let totalLength = 0;

  for (let i = 0; i < spacedPoints.length; i++) {
    const pt = spacedPoints[i];
    const u = i / spacedPoints.length;
    const tangent = curve.getTangentAt(u).normalize();
    
    // Up vector approximation, adjusted for track banking
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(tangent.y) > 0.95) {
      up = new THREE.Vector3(0, 0, 1);
    }
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

    if (i > 0) {
      totalLength += pt.distanceTo(spacedPoints[i - 1]);
    }

    samples.push({
      index: i,
      u,
      position: pt,
      tangent,
      right,
      normal,
      distance: totalLength
    });
  }

  return {
    curve,
    samples,
    totalLength,
    getClosestSample: (pos) => {
      let closestIdx = 0;
      let minDistSq = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const dSq = samples[i].position.distanceToSquared(pos);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closestIdx = i;
        }
      }
      return { sample: samples[closestIdx], distance: Math.sqrt(minDistSq), index: closestIdx };
    }
  };
}
