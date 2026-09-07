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
    this.launchTimer = 0;
    this.launchDelay = 0.25;

    // Difficulty tuning factors
    this.applyDifficulty(difficulty);
  }

  applyDifficulty(difficulty) {
    this.difficulty = difficulty;
    switch (difficulty) {
      case 'EASY':
        this.speedFactor = 0.70;
        this.corneringGrip = 0.78;
        this.aggression = 0.35;
        this.lookaheadDist = 20;
        this.launchDelay = 0.38 + Math.random() * 0.20;
        break;
      case 'NORMAL':
        this.speedFactor = 0.80;
        this.corneringGrip = 0.86;
        this.aggression = 0.58;
        this.lookaheadDist = 26;
        this.launchDelay = 0.22 + Math.random() * 0.18;
        break;
      case 'HARD':
        this.speedFactor = 0.88;
        this.corneringGrip = 0.94;
        this.aggression = 0.78;
        this.lookaheadDist = 32;
        this.launchDelay = 0.14 + Math.random() * 0.12;
        break;
      case 'EXPERT':
        this.speedFactor = 0.94;
        this.corneringGrip = 1.00;
        this.aggression = 0.90;
        this.lookaheadDist = 36;
        this.launchDelay = 0.08 + Math.random() * 0.08;
        break;
      default:
        this.speedFactor = 0.80;
        this.corneringGrip = 0.86;
        this.aggression = 0.58;
        this.lookaheadDist = 26;
        this.launchDelay = 0.22;
    }
  }

  update(dt, trackData, otherCars = [], trafficCars = [], isRacing = true) {
    if (!isRacing) {
      this.physics.velocity.set(0, 0, 0);
      this.physics.angularVelocity.set(0, 0, 0);
      this.physics.speed = 0;
      this.physics.speedKmh = 0;
      this.physics.gear = 1;
      this.physics.rpm = this.physics.idleRpm;
      this.physics.throttle = 0;
      this.physics.brake = 0;
      this.launchTimer = 0;
      return;
    }

    if (!trackData || !trackData.samples || trackData.samples.length === 0) return;

    const carPos = this.physics.position;
    const closest = trackData.getClosestSample(carPos);
    if (!closest || !closest.sample) return;

    const samples = trackData.samples;
    const currentIdx = closest.index;

    // Launch delay: human-like reaction time off starting grid
    if (this.launchTimer < this.launchDelay) {
      this.launchTimer += dt;
      const inputs = {
        throttle: 0.15,
        brake: 0,
        steer: 0,
        handbrake: 0,
        nitro: false
      };
      this.physics.update(inputs, dt, 1.0, trackData);
      return;
    }
    this.launchTimer += dt;

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

    // --- 2. DYNAMIC RUBBER-BANDING & PROXIMITY SPEED LIMITER ---
    const player = otherCars && otherCars.length > 0 ? otherCars[0] : null;
    let rubberBandFactor = 1.0;

    // Baseline safe speed based on car top speed and difficulty
    let safeSpeedKmh = this.physics.topSpeedKmh * this.speedFactor;

    if (player && player.position) {
      const toPlayer = new THREE.Vector3().subVectors(player.position, carPos);
      const distToPlayer = toPlayer.length();
      const forwardDistToPlayer = toPlayer.dot(this.physics.forward); // > 0: player ahead; < 0: AI ahead
      const playerSpeed = player.speedKmh || 0;

      if (this.difficulty !== 'EXPERT') {
        if (forwardDistToPlayer < -25) {
          // AI is more than 25m ahead: ease off so races remain close and competitive
          const lead = Math.min(100, Math.abs(forwardDistToPlayer) - 25);
          rubberBandFactor = Math.max(0.80, 1.0 - (lead / 160));
        } else if (forwardDistToPlayer > 35) {
          // AI is more than 35m behind: moderate catch-up without warp spikes
          const lag = Math.min(80, forwardDistToPlayer - 35);
          rubberBandFactor = Math.min(1.05, 1.0 + (lag / 280));
        }
      }

      safeSpeedKmh *= rubberBandFactor;

      // CRUCIAL: Close Proximity Speed Governor to eliminate unrealistic rocket overtakes!
      // When AI is within 65m of the player and behind or alongside (forwardDistToPlayer > -12m):
      if (distToPlayer < 65 && forwardDistToPlayer > -12) {
        const allowedLead = this.difficulty === 'EXPERT' ? 22 :
                            this.difficulty === 'HARD' ? 16 :
                            this.difficulty === 'EASY' ? 7 : 11;
        // Never exceed player's speed + allowedLead, with safe lower floor of 48 km/h
        const maxProximitySpeed = Math.max(playerSpeed + allowedLead, 48);
        safeSpeedKmh = Math.min(safeSpeedKmh, maxProximitySpeed);
      }
    } else {
      safeSpeedKmh *= rubberBandFactor;
    }

    // --- 3. CORNER SPEED & BRAKING CALCULATION ---
    const farIdx = (currentIdx + lookSteps * 2) % samples.length;
    const farSample = samples[farIdx];
    const curvatureAngle = Math.abs(targetSample.tangent.angleTo(farSample.tangent));

    if (curvatureAngle > 0.20) {
      const cornerTightness = clamp(curvatureAngle / 1.15, 0, 1);
      safeSpeedKmh = THREE.MathUtils.lerp(safeSpeedKmh * 0.80, 82 * this.corneringGrip, cornerTightness);
    }

    // General obstacle speed delta cap (for AI vs AI and AI vs civilian traffic)
    if (this.nearestObstacleSpeedKmh !== null && this.nearestObstacleSpeedKmh < 320) {
      const maxPassDelta = this.difficulty === 'EXPERT' ? 18 : this.difficulty === 'HARD' ? 14 : 9;
      safeSpeedKmh = Math.min(safeSpeedKmh, Math.max(45, this.nearestObstacleSpeedKmh + maxPassDelta));
    }

    // --- 4. THROTTLE & BRAKE INPUTS ---
    let throttle = 0;
    let brake = 0;
    let nitro = false;

    // Max AI throttle cap to prevent instant jerk acceleration
    const maxThrottle = this.difficulty === 'EXPERT' ? 0.94 :
                        this.difficulty === 'HARD' ? 0.88 : 0.82;

    if (this.physics.speedKmh < safeSpeedKmh - 4) {
      const launchRamp = Math.min(1.0, (this.launchTimer - this.launchDelay) / 0.65);
      const rawThrottle = clamp((safeSpeedKmh - this.physics.speedKmh) / 20, 0.40, maxThrottle);
      throttle = rawThrottle * launchRamp;
      brake = 0.0;

      // Strategic nitro: only on Hard/Expert on open straights when not directly alongside player
      if ((this.difficulty === 'HARD' || this.difficulty === 'EXPERT') && this.aggression > 0.82) {
        if (curvatureAngle < 0.08 && this.physics.speedKmh > 140 && Math.random() < 0.008) {
          nitro = true;
        }
      }
    } else if (this.physics.speedKmh > safeSpeedKmh + 3) {
      throttle = 0.0;
      brake = clamp((this.physics.speedKmh - safeSpeedKmh) / 18, 0.35, 0.92);
    } else {
      throttle = 0.38;
      brake = 0.0;
    }

    // --- 5. RECOVERY FROM STALL OR SPIN ---
    if (this.physics.speedKmh < 8 && throttle > 0.4) {
      this.recoverTimer += dt;
      if (this.recoverTimer > 2.2) {
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
    let nearestSpeed = 999;
    let closestDist = 999;
    this.isDrafting = false;

    for (let i = 0; i < allObstacles.length; i++) {
      const other = allObstacles[i];
      if (!other || other.id === this.id) continue;

      const otherPos = other.physics ? other.physics.position : other.position;
      if (!otherPos) continue;
      const dist = carPos.distanceTo(otherPos);

      if (dist < 32) {
        const toOther = new THREE.Vector3().subVectors(otherPos, carPos);
        const forwardDot = toOther.dot(this.physics.forward);
        const lateralDot = toOther.dot(this.physics.right);

        // Check if other car is ahead OR alongside within danger zone (-4.5m to 28m)
        if (forwardDot > -4.5 && Math.abs(lateralDot) < 4.5) {
          if (dist < closestDist) {
            closestDist = dist;
            obstacleAhead = true;
            obstacleLateral = lateralDot;

            const otherSpeed = other.physics ? other.physics.speedKmh : (other.speedKmh || 120);
            nearestSpeed = otherSpeed;

            // Slipstream drafting detection: directly behind
            if (dist < 20 && forwardDot > 1.2 && Math.abs(lateralDot) < 2.0) {
              this.isDrafting = true;
            }
          }
        }
      }
    }

    this.nearestObstacleSpeedKmh = obstacleAhead ? nearestSpeed : null;

    if (obstacleAhead) {
      // Swerve into passing lane with smooth damping
      const evadeDir = obstacleLateral >= 0 ? -1 : 1;
      const targetOffset = evadeDir * Math.min(4.5, roadWidth * 0.28);
      this.overtakeOffset = damp(this.overtakeOffset, targetOffset, 3.8, 0.03);
    } else {
      this.overtakeOffset = damp(this.overtakeOffset, 0, 1.8, 0.03);
    }
  }
}
