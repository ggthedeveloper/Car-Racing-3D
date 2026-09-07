import * as THREE from 'three';
import { AIRacer } from './AIRacer.js';
import { CarBuilder } from '../vehicles/CarBuilder.js';
import { VehicleVisuals } from '../vehicles/VehicleVisuals.js';
import { CAR_DEFINITIONS } from '../vehicles/CarDefinitions.js';

const AI_PROFILES = [
  { name: 'Viper', carIndex: 1, color: '#ef4444', skill: 1.05 },
  { name: 'Ghost', carIndex: 4, color: '#f8fafc', skill: 1.02 },
  { name: 'Apex', carIndex: 3, color: '#10b981', skill: 1.08 },
  { name: 'Razor', carIndex: 2, color: '#f59e0b', skill: 0.98 },
  { name: 'Storm', carIndex: 0, color: '#06b6d4', skill: 0.95 },
  { name: 'Phoenix', carIndex: 5, color: '#a855f7', skill: 1.04 },
  { name: 'Blaze', carIndex: 2, color: '#ec4899', skill: 0.92 }
];

export class AIManager {
  constructor(scene, collisionSystem, difficulty = 'NORMAL') {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.difficulty = difficulty;
    this.racers = [];
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.racers.forEach((r) => r.applyDifficulty(difficulty));
  }

  spawnGrid(gridPositions, count = 7, playerCarDef = null) {
    this.cleanup();

    const spawnCount = Math.min(count, AI_PROFILES.length);
    for (let i = 0; i < spawnCount; i++) {
      const profile = AI_PROFILES[i];
      const baseCarDef = CAR_DEFINITIONS[profile.carIndex % CAR_DEFINITIONS.length];

      // Deep clone to balance AI physics to player's car tier
      const carDef = JSON.parse(JSON.stringify(baseCarDef));
      if (playerCarDef && playerCarDef.physics) {
        const pPhys = playerCarDef.physics;
        // Balance engine power within +/- 6% of player car power
        const powerVariance = 0.94 + (Math.random() * 0.10);
        carDef.physics.enginePower = Math.round(pPhys.enginePower * powerVariance);
        // Balance top speed within +/- 4% of player top speed
        const speedVariance = 0.96 + (Math.random() * 0.08);
        carDef.physics.topSpeedKmh = Math.round(pPhys.topSpeedKmh * speedVariance);
        // Balance mass close to player
        carDef.physics.mass = Math.round(pPhys.mass * (0.96 + Math.random() * 0.08));
      }

      const ai = new AIRacer(`ai_${i}`, profile.name, carDef, profile.skill, this.difficulty);

      // Grid position: grid[0] is player (pole), grid[1..7] are AI
      const gridSlot = gridPositions[i + 1] || gridPositions[0];
      ai.physics.reset(gridSlot.position.clone(), gridSlot.yaw);

      // Build 3D mesh
      const carMeshObj = CarBuilder.buildCarMesh(
        carDef,
        profile.color,
        'metallic',
        'sport_wing',
        'spoke5',
        false
      );
      this.scene.add(carMeshObj.root);

      ai.visuals = new VehicleVisuals(carMeshObj);
      this.racers.push(ai);
    }
  }

  update(dt, trackData, playerVehicle, isNightOrFog = false, trafficCars = []) {
    const allCars = [playerVehicle, ...this.racers];

    for (let i = 0; i < this.racers.length; i++) {
      const ai = this.racers[i];
      ai.update(dt, trackData, allCars, trafficCars);

      // Collisions with barriers
      if (this.collisionSystem) {
        this.collisionSystem.resolveTrackBoundaries(ai.physics);

        // Collisions with traffic cars
        if (trafficCars && trafficCars.length > 0) {
          trafficCars.forEach((tc) => {
            this.collisionSystem.resolveVehicleTraffic(ai.physics, tc);
          });
        }
      }

      // Update 3D visual transforms
      if (ai.visuals) {
        ai.visuals.update(ai.physics, isNightOrFog);
      }
    }
  }

  cleanup() {
    this.racers.forEach((ai) => {
      if (ai.visuals) {
        ai.visuals.dispose();
      }
    });
    this.racers = [];
  }
}
