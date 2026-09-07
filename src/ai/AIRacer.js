import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics.js';
import { clamp, damp } from '../utils/math.js';

export class AIRacer {
  constructor(id, name, carDef, skill = 1.0, difficulty = 'NORMAL') {
    this.id = id;
    this.name = name;
    this.carDef = carDef;
    this.skill = skill; // individual driver nuance
    this.difficulty = difficulty;

    this.physics = new VehiclePhysics(carDef, {});
    this.visuals = null; // linked later

    // AI Driving State
    this.currentLap = 1;
    this.targetSpeedKmh = 160;
    this.steerSmoothed = 0;
    this.lookaheadDist = 28; // meters ahead along spline
    this.laneOffset = (Math.random() - 0.5) * 4.0; // slight racing line variation
    this.overtakeOffset = 0;
    this.recoverTimer = 0;

    // Difficulty tuning factors
    this.applyDifficulty(difficulty);
  }

  applyDifficulty(difficulty) {
    this.difficulty = difficulty;
    switch (difficulty) {
      case 'EASY':
        this.speedFactor = 0.76;
        this.corneringGrip = 0.82;
        this.aggression = 0.4;
        this.lookaheadDist = 22;
        break;
      case 'NORMAL':
        this.speedFactor = 0.88;
        this.corneringGrip = 0.92;
        this.aggression = 0.7;
        this.lookaheadDist = 28;
        break;
      case 'HARD':
        this.speedFactor = 0.96;
        this.corneringGrip = 1.02;
        this.aggression = 0.9;
        this.lookaheadDist = 34;
        break;
      case 'EXPERT':
        this.speedFactor = 1.04;
        this.corneringGrip = 1.10;
        this.aggression = 1.0;
        this.lookaheadDist = 38;
        break;
      default:
        this.speedFactor = 0.88;
        this.corneringGrip = 0.92;
        this.aggression = 0.7;
        this.lookaheadDist = 28;
    }
  }

  update(dt, trackData, otherCars = [], trafficCars = []) {
    if (!trackData || !trackData.samples || trackData.samples.length === 0) return;

    const carPos = this.physics.position;
    const closest = trackData.getClosestSample(carPos);
    if (!closest || !closest.sample) return;

    const samples = trackData.samples;
    const currentIdx = closest.index;

    // --- 1. LOOKAHEAD TARGET POINT ALONG RACING LINE ---
    const lookSteps = Math.max(10, Math.floor(this.lookaheadDist * (1 + this.physics.speed / 40)));
    const targetIdx = (currentIdx + lookSteps) % samples.length;
    const targetSample = samples[targetIdx];

    // Overtake & Traffic avoidance logic
    const allObstacles = [...otherCars, ...(trafficCars || [])];
    this.evaluateOvertake(carPos, targetSample, allObstacles, trackData.roadWidth);

    // Desired target position on the road
    const effectiveOffset = clamp(this.laneOffset + this.overtakeOffset, -trackData.roadWidth * 0.38, trackData.roadWidth * 0.38);
    const targetPoint = targetSample.position.clone().addScaledVector(targetSample.right, effectiveOffset);

    // Vector to target point
    const toTarget = new THREE.Vector3().subVectors(targetPoint, carPos);

    // Project toTarget onto car's local axes
    const localTargetX = toTarget.dot(this.physics.right);
    const localTargetZ = toTarget.dot(this.physics.forward);

    // Desired steer angle
    const targetSteerAngle = Math.atan2(localTargetX, Math.max(2.0, localTargetZ));
    const normalizedSteer = clamp(targetSteerAngle / (this.physics.maxSteerAngle || 0.5), -1, 1);
    this.steerSmoothed = damp(this.steerSmoothed, normalizedSteer, 8 * this.skill, dt);

    // --- 2. CORNER SPEED & BRAKING CALCULATION ---
    const farIdx = (currentIdx + lookSteps * 2) % samples.length;
    const farSample = samples[farIdx];
    const curvatureAngle = Math.abs(targetSample.tangent.angleTo(farSample.tangent));

    let safeSpeedKmh = this.physics.topSpeedKmh * this.speedFactor;
    if (curvatureAngle > 0.25) {
      const cornerTightness = clamp(curvatureAngle / 1.2, 0, 1);
      safeSpeedKmh = THREE.MathUtils.lerp(this.physics.topSpeedKmh * 0.85, 95 * this.corneringGrip, cornerTightness);
    }

    // --- 3. THROTTLE & BRAKE INPUTS ---
    let throttle = 0;
    let brake = 0;
    let nitro = false;

    if (this.physics.speedKmh < safeSpeedKmh - 5) {
      throttle = 1.0;
      brake = 0.0;
      // Use nitro on straights or when drafting on Hard/Expert
      if ((curvatureAngle < 0.15 || this.isDrafting) && this.physics.speedKmh > 120 && this.aggression > 0.75 && Math.random() < 0.03) {
        nitro = true;
      }
    } else if (this.physics.speedKmh > safeSpeedKmh + 8) {
      throttle = 0.0;
      brake = clamp((this.physics.speedKmh - safeSpeedKmh) / 25, 0.4, 1.0);
    } else {
      throttle = 0.48;
      brake = 0.0;
    }

    // --- 4. RECOVERY FROM STALL OR SPIN ---
    if (this.physics.speedKmh < 8 && throttle > 0.5) {
      this.recoverTimer += dt;
      if (this.recoverTimer > 2.5) {
        this.physics.rotation.y = Math.atan2(closest.sample.tangent.x, closest.sample.tangent.z);
        this.physics.velocity.set(0, 0, 0);
        this.recoverTimer = 0;
      }
    } else {
      this.recoverTimer = 0;
    }

    // Pass controls into physics simulation
    const inputs = {
      throttle,
      brake,
      steer: this.steerSmoothed,
      handbrake: 0,
      nitro
    };

    this.physics.isDrafting = this.isDrafting;
    this.physics.update(inputs, dt, 1.0, trackData);
  }

  evaluateOvertake(carPos, targetSample, allObstacles, roadWidth) {
    let obstacleAhead = false;
    let obstacleLateral = 0;
    this.isDrafting = false;

    for (let i = 0; i < allObstacles.length; i++) {
      const other = allObstacles[i];
      if (other.id === this.id) continue;

      const otherPos = other.physics ? other.physics.position : other.position;
      if (!otherPos) continue;
      const dist = carPos.distanceTo(otherPos);

      if (dist < 26) {
        const toOther = new THREE.Vector3().subVectors(otherPos, carPos);
        const forwardDot = toOther.dot(this.physics.forward);
        if (forwardDot > 1.8) {
          obstacleAhead = true;
          obstacleLateral = toOther.dot(this.physics.right);

          // Slipstream drafting detection
          if (dist < 18 && Math.abs(obstacleLateral) < 2.0) {
            this.isDrafting = true;
          }
          break;
        }
      }
    }

    if (obstacleAhead) {
      // Swerve into passing lane
      const evadeDir = obstacleLateral >= 0 ? -1 : 1;
      this.overtakeOffset = damp(this.overtakeOffset, evadeDir * Math.min(5.5, roadWidth * 0.32), 5, 0.03);
    } else {
      this.overtakeOffset = damp(this.overtakeOffset, 0, 2, 0.03);
    }
  }
}
