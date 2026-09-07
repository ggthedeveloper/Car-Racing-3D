import * as THREE from 'three';
import { clamp, damp } from '../utils/math.js';

export class CameraSystem {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'CHASE'; // 'CHASE', 'CLOSE_CHASE', 'HOOD', 'COCKPIT', 'CINEMATIC'

    this.currentPos = new THREE.Vector3(0, 5, -10);
    this.currentTarget = new THREE.Vector3();
    this.shakeIntensity = 0;

    this.baseFov = 64;
    this.maxFov = 86;

    this.cinematicAngle = 0;
    this.cameraBank = 0;
  }

  setMode(mode) {
    this.mode = mode;
  }

  cycleMode() {
    const modes = ['CHASE', 'CLOSE_CHASE', 'HOOD', 'COCKPIT', 'CINEMATIC'];
    const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
    this.mode = modes[nextIdx];
    return this.mode;
  }

  triggerShake(intensity = 0.5) {
    this.shakeIntensity = Math.min(2.0, this.shakeIntensity + intensity);
  }

  update(dt, vehicle) {
    if (!vehicle || !this.camera) return;

    // --- DYNAMIC FOV BASED ON SPEED & NITRO BURST ---
    const speedRatio = clamp(vehicle.speedKmh / 320, 0, 1);
    let targetFov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, speedRatio);
    if (vehicle.nitroActive) {
      targetFov += (vehicle.nitroTier === 2 ? 8.5 : 5.0); // Asphalt-style warp kick
    }
    this.camera.fov = damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();

    // Road surface bump vibration (rumble strips / off-road dirt)
    if (vehicle.currentSurface && vehicle.currentSurface.name === 'Rumble Strip' && vehicle.speedKmh > 30) {
      this.triggerShake(0.08);
    } else if (vehicle.currentSurface && (vehicle.currentSurface.name === 'Dirt' || vehicle.currentSurface.name === 'Grass') && vehicle.speedKmh > 40) {
      this.triggerShake(0.06);
    }

    // Camera shake calculation
    const shakeOffset = new THREE.Vector3();
    if (this.shakeIntensity > 0.01) {
      shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity * 0.4,
        (Math.random() - 0.5) * this.shakeIntensity * 0.3,
        (Math.random() - 0.5) * this.shakeIntensity * 0.4
      );
      this.shakeIntensity = damp(this.shakeIntensity, 0, 8, dt);
    }

    const carPos = vehicle.position;
    const forward = vehicle.forward;
    const up = vehicle.up;

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    switch (this.mode) {
      case 'CHASE': {
        // Distance expands slightly with speed
        const dynamicDist = 6.4 + speedRatio * 1.6;
        const dynamicHeight = 2.1 + (vehicle.pitch || 0) * 1.2;

        targetCamPos.copy(carPos)
          .addScaledVector(forward, -dynamicDist)
          .addScaledVector(up, dynamicHeight);

        lookTarget.copy(carPos).addScaledVector(forward, 6.0).addScaledVector(up, 0.9);

        // Smooth follow damp
        this.currentPos.lerp(targetCamPos, 1 - Math.exp(-12 * dt));
        this.currentTarget.lerp(lookTarget, 1 - Math.exp(-15 * dt));
        break;
      }

      case 'CLOSE_CHASE': {
        const dynamicDist = 4.6 + speedRatio * 1.0;
        const dynamicHeight = 1.6;

        targetCamPos.copy(carPos)
          .addScaledVector(forward, -dynamicDist)
          .addScaledVector(up, dynamicHeight);

        lookTarget.copy(carPos).addScaledVector(forward, 4.0).addScaledVector(up, 0.8);

        this.currentPos.lerp(targetCamPos, 1 - Math.exp(-16 * dt));
        this.currentTarget.lerp(lookTarget, 1 - Math.exp(-18 * dt));
        break;
      }

      case 'HOOD': {
        // Front hood view
        targetCamPos.copy(carPos)
          .addScaledVector(forward, 1.2)
          .addScaledVector(up, 0.95);

        lookTarget.copy(carPos).addScaledVector(forward, 25.0).addScaledVector(up, 0.9);

        this.currentPos.copy(targetCamPos);
        this.currentTarget.copy(lookTarget);
        break;
      }

      case 'COCKPIT': {
        // Driver eye perspective
        targetCamPos.copy(carPos)
          .addScaledVector(forward, -0.1)
          .addScaledVector(vehicle.right, -0.32)
          .addScaledVector(up, 1.05);

        lookTarget.copy(carPos).addScaledVector(forward, 30.0).addScaledVector(up, 1.0);

        this.currentPos.copy(targetCamPos);
        this.currentTarget.copy(lookTarget);
        break;
      }

      case 'CINEMATIC': {
        this.cinematicAngle += dt * 0.45;
        const orbitDist = 8.5;
        const orbitHeight = 2.4;

        targetCamPos.set(
          carPos.x + Math.sin(this.cinematicAngle) * orbitDist,
          carPos.y + orbitHeight,
          carPos.z + Math.cos(this.cinematicAngle) * orbitDist
        );

        lookTarget.copy(carPos).addScaledVector(up, 0.8);

        this.currentPos.lerp(targetCamPos, 1 - Math.exp(-6 * dt));
        this.currentTarget.lerp(lookTarget, 1 - Math.exp(-10 * dt));
        break;
      }

      default:
        break;
    }

    // Apply shake and set camera
    this.camera.position.copy(this.currentPos).add(shakeOffset);
    this.camera.lookAt(this.currentTarget.clone().add(shakeOffset));

    // High-speed camera banking into turns
    if (this.mode === 'CHASE' || this.mode === 'CLOSE_CHASE' || this.mode === 'COCKPIT') {
      const targetBank = clamp(-(vehicle.lateralSlip || 0) * 0.003 - (vehicle.dynamicRoll || 0) * 0.35, -0.065, 0.065);
      this.cameraBank = damp(this.cameraBank, targetBank, 10, dt);
      this.camera.rotation.z += this.cameraBank;
    }
  }
}
