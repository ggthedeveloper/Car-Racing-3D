import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CollisionSystem } from '../physics/CollisionSystem.js';

describe('CollisionSystem', () => {
  it('instantiates collision system with track data', () => {
    const col = new CollisionSystem({ roadWidth: 16 });
    expect(col.trackData.roadWidth).toBe(16);
  });

  it('detects vehicle to vehicle collisions within contact radius', () => {
    const col = new CollisionSystem();

    const vehA = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(10, 0, 0),
      mass: 1400,
      applyCollision: () => {},
    };

    const vehB = {
      position: new THREE.Vector3(1.5, 0, 0), // Within 2.6m radius
      velocity: new THREE.Vector3(-10, 0, 0),
      mass: 1400,
      applyCollision: () => {},
    };

    const result = col.resolveVehicleVehicle(vehA, vehB);
    expect(result).not.toBeNull();
    expect(result.collided).toBe(true);
    expect(result.type).toBe('vehicle');
    // Vehicles must be repelled/separated
    expect(vehA.position.x).toBeLessThan(0);
    expect(vehB.position.x).toBeGreaterThan(1.5);
  });

  it('ignores vehicles that are far apart', () => {
    const col = new CollisionSystem();

    const vehA = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      mass: 1400,
    };

    const vehB = {
      position: new THREE.Vector3(50, 0, 50),
      velocity: new THREE.Vector3(0, 0, 0),
      mass: 1400,
    };

    const result = col.resolveVehicleVehicle(vehA, vehB);
    expect(result).toBeNull();
  });
});
