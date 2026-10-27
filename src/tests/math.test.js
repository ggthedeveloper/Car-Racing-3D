import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  damp,
  mapRange,
  degToRad,
  radToDeg,
  normalizeAngle,
  formatTime,
  formatSpeed,
} from '../utils/math.js';

describe('Math Utilities', () => {
  it('clamp restricts value between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('lerp performs linear interpolation', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('damp smoothly decays toward target', () => {
    const val = damp(0, 100, 2.0, 0.5);
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThan(100);
  });

  it('mapRange maps values accurately across ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(0, 0, 10, 100, 200)).toBe(100);
    expect(mapRange(10, 0, 10, 100, 200)).toBe(200);
  });

  it('converts degrees and radians correctly', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
  });

  it('normalizeAngle wraps angle within [-PI, PI]', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
  });

  it('formatTime formats lap seconds into MM:SS.mmm format', () => {
    expect(formatTime(0)).toBe('--:--.---');
    expect(formatTime(-1)).toBe('--:--.---');
    expect(formatTime(65.432)).toBe('01:05.432');
    expect(formatTime(125.005)).toBe('02:05.005');
  });

  it('formatSpeed converts m/s to km/h and mph', () => {
    // 10 m/s = 36 km/h
    expect(formatSpeed(10, 'kmh')).toBe(36);
    // 10 m/s ≈ 22 mph
    expect(formatSpeed(10, 'mph')).toBe(22);
  });
});
