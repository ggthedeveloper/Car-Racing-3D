import * as THREE from 'three';
import { clamp, lerp, damp, mapRange, normalizeAngle } from '../utils/math.js';

export const SURFACE_PROFILES = {
  ASPHALT: { name: 'Asphalt', grip: 1.0, rollingResistance: 26.0, dragMultiplier: 1.0, sound: 'asphalt', particle: 'smoke' },
  WET_ASPHALT: { name: 'Wet Asphalt', grip: 0.82, rollingResistance: 29.0, dragMultiplier: 1.02, sound: 'wet', particle: 'spray' },
  RUMBLE_STRIP: { name: 'Rumble Strip', grip: 0.94, rollingResistance: 44.0, dragMultiplier: 1.04, sound: 'rumble', particle: 'smoke' },
  DIRT: { name: 'Dirt', grip: 0.70, rollingResistance: 58.0, dragMultiplier: 1.10, sound: 'dirt', particle: 'dust' },
  GRASS: { name: 'Grass', grip: 0.56, rollingResistance: 66.0, dragMultiplier: 1.15, sound: 'grass', particle: 'dust' },
  SAND: { name: 'Sand', grip: 0.50, rollingResistance: 88.0, dragMultiplier: 1.25, sound: 'sand', particle: 'dust' },
  SNOW: { name: 'Snow', grip: 0.44, rollingResistance: 54.0, dragMultiplier: 1.08, sound: 'snow', particle: 'snow' }
};

export class VehiclePhysics {
  constructor(carDef, upgrades = {}) {
    this.carDef = carDef;
    this.upgrades = upgrades;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 0.4, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    // Velocities
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
    this.speed = 0; // m/s
    this.speedKmh = 0;
    this.localVelocity = new THREE.Vector3();

    // Direction vectors
    this.forward = new THREE.Vector3(0, 0, 1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.up = new THREE.Vector3(0, 1, 0);

    // Steering
    this.steerAngle = 0;
    this.targetSteer = 0;

    // Transmission & Engine
    this.gear = 1; // 1 to 8, -1 is Reverse, 0 is Neutral
    this.rpm = 900;
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = 0;
    this.isShifting = false;
    this.shiftTimer = 0;
    this.shiftDuration = 0.12; // Realistic automatic clutch shift delay

    // Multi-Stage Nitro (Standard + Perfect Nitro)
    this.nitroActive = false;
    this.nitroTier = 0; // 0 = off, 1 = standard (blue), 2 = perfect nitro (magenta/purple)
    this.nitroAmount = 100; // 0 to 100%
    this.nitroMax = 100;
    this.nitroRechargeRate = 4.5; // % per second
    this.nitroConsumeRate = 22.0; // % per second
    this.perfectNitroWindow = 0; // Timer tracking perfect nitro timing window
    this.isPerfectNitroReady = false;
    this.isDrafting = false; // Drafting behind opponent

    // Drift system
    this.isDrifting = false;
    this.driftAngle = 0; // in degrees
    this.driftScore = 0;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.driftDuration = 0;
    this.driftComboTimer = 0;
    this.lateralSlip = 0;

    // Surface physics profile
    this.currentSurface = SURFACE_PROFILES.ASPHALT;

    // Suspension & Weight Transfer Visuals
    this.pitch = 0;
    this.roll = 0;
    this.roadPitch = 0;
    this.roadRoll = 0;
    this.dynamicPitch = 0;
    this.dynamicRoll = 0;
    this.suspensionCompression = [0, 0, 0, 0]; // FL, FR, RL, RR
    this.wheelRotations = [0, 0, 0, 0];

    // Damage
    this.damage = 0; // 0 (pristine) to 100 (heavily damaged)

    // Collisions
    this.collisionImpulse = new THREE.Vector3();
    this.collisionCooldown = 0;

    // Wheel contact
    this.isGrounded = true;

    // Apply upgrade modifiers to base stats
    this.applyUpgrades(upgrades);
  }

  applyUpgrades(up = {}) {
    const basePhys = this.carDef.physics;
    const engineLvl = up.engine || 0;
    const brakesLvl = up.brakes || 0;
    const tiresLvl = up.tires || 0;
    const suspLvl = up.suspension || 0;
    const transLvl = up.transmission || 0;
    const aeroLvl = up.aerodynamics || 0;
    const nitroLvl = up.nitro || 0;

    this.mass = basePhys.mass;
    this.topSpeedKmh = basePhys.topSpeedKmh + engineLvl * 8;
    this.enginePower = basePhys.enginePower * (1 + engineLvl * 0.12 + transLvl * 0.05);
    this.brakeTorque = basePhys.brakeTorque * (1 + brakesLvl * 0.18);
    this.maxSteerAngle = basePhys.maxSteerAngle;
    this.steerSpeed = basePhys.steerSpeed * (1 + suspLvl * 0.1);
    this.tireGripFront = basePhys.tireGripFront * (1 + tiresLvl * 0.12);
    this.tireGripRear = basePhys.tireGripRear * (1 + tiresLvl * 0.12);
    this.driftFriction = basePhys.driftFriction;
    this.downforceCoeff = basePhys.downforceCoeff * (1 + aeroLvl * 0.25);
    this.dragCoeff = basePhys.dragCoeff * (1 - aeroLvl * 0.03);
    this.gearRatios = [...basePhys.gearRatios];
    this.reverseRatio = basePhys.reverseRatio;
    this.finalDrive = basePhys.finalDrive;
    this.redlineRpm = basePhys.redlineRpm;
    this.idleRpm = basePhys.idleRpm;

    this.nitroMultiplier = 1.32 + nitroLvl * 0.12;
    this.perfectNitroMultiplier = 1.62 + nitroLvl * 0.15;
    this.nitroRechargeRate = 4.5 * (1 + nitroLvl * 0.2);
  }

  reset(position = new THREE.Vector3(0, 0.4, 0), yaw = 0) {
    this.position.copy(position);
    this.rotation.set(0, yaw, 0);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.speed = 0;
    this.speedKmh = 0;
    this.gear = 1;
    this.rpm = this.idleRpm;
    this.steerAngle = 0;
    this.targetSteer = 0;
    this.isShifting = false;
    this.shiftTimer = 0;
    this.nitroActive = false;
    this.nitroTier = 0;
    this.isDrifting = false;
    this.driftAngle = 0;
    this.currentDriftScore = 0;
    this.roadPitch = 0;
    this.roadRoll = 0;
    this.dynamicPitch = 0;
    this.dynamicRoll = 0;
    this.pitch = 0;
    this.roll = 0;
    this.damage = 0;
    this.currentSurface = SURFACE_PROFILES.ASPHALT;
    this.suspensionCompression = [0, 0, 0, 0];
  }

  calculateEngineTorque(rpm) {
    const idle = this.idleRpm;
    const redline = this.redlineRpm;
    const normRpm = clamp((rpm - idle) / (redline - idle), 0, 1.15);
    // Smooth torque curve with wide mid-range torque plateau and soft redline roll-off
    const peakPos = 0.65;
    const torqueCurve = Math.max(0.55, 1.0 - Math.pow((normRpm - peakPos) / 0.85, 2) * 0.45);
    return torqueCurve * (this.carDef.physics.torqueCurveMultiplier || 1.0);
  }

  update(inputs, dt, surfaceFriction = 1.0, trackData = null) {
    if (dt <= 0 || isNaN(dt)) return;
    dt = Math.min(dt, 0.05); // prevent physics simulation explosion on frame drop

    // Parse player/AI inputs
    const throttleInput = clamp(inputs.throttle || 0, 0, 1);
    const brakeInput = clamp(inputs.brake || 0, 0, 1);
    const steerInput = clamp(inputs.steer || 0, -1, 1);
    const handbrakeInput = inputs.handbrake ? 1 : 0;
    const rawNitro = !!inputs.nitro;

    this.throttle = throttleInput;
    this.brake = brakeInput;
    this.handbrake = handbrakeInput;

    // --- SURFACE DETECTION ---
    let currentSurface = SURFACE_PROFILES.ASPHALT;
    if (trackData && trackData.samples) {
      const closest = trackData.getClosestSample(this.position);
      if (closest && closest.sample) {
        const halfW = (trackData.roadWidth || 16.0) * 0.5;
        const toCar = new THREE.Vector3().subVectors(this.position, closest.sample.position);
        const latDist = Math.abs(toCar.dot(closest.sample.right));
        const trackTheme = trackData.theme || 'city';

        if (latDist > halfW + 1.2) {
          if (trackTheme === 'desert') currentSurface = SURFACE_PROFILES.SAND;
          else if (trackTheme === 'mountain' || trackTheme === 'forest') currentSurface = SURFACE_PROFILES.DIRT;
          else currentSurface = SURFACE_PROFILES.GRASS;
        } else if (latDist > halfW - 0.9) {
          currentSurface = SURFACE_PROFILES.RUMBLE_STRIP;
        } else if (surfaceFriction < 0.9) {
          currentSurface = SURFACE_PROFILES.WET_ASPHALT;
        }
      }
    }
    this.currentSurface = currentSurface;
    const effectiveSurfaceGrip = surfaceFriction * this.currentSurface.grip;

    // --- MULTI-STAGE NITRO SYSTEM (Standard Boost & Perfect Nitro) ---
    if (this.perfectNitroWindow > 0) {
      this.perfectNitroWindow -= dt;
      if (this.perfectNitroWindow <= 0) {
        this.isPerfectNitroReady = false;
      }
    }

    if (rawNitro && this.nitroAmount > 3 && throttleInput > 0.15) {
      if (!this.nitroActive) {
        // First activation: Standard Nitro
        this.nitroActive = true;
        this.nitroTier = 1;
        this.perfectNitroWindow = 0.40; // 400ms window to tap again for Perfect Nitro
        this.isPerfectNitroReady = true;
      } else if (this.isPerfectNitroReady && this.perfectNitroWindow > 0.04 && this.perfectNitroWindow < 0.32) {
        // Player tapped nitro again inside the timing window: PERFECT NITRO!
        this.nitroTier = 2;
        this.isPerfectNitroReady = false;
        this.perfectNitroWindow = 0;
      }

      // Consume nitro (Perfect Nitro gives huge speed for slightly higher burn rate)
      const burnRate = this.nitroTier === 2 ? this.nitroConsumeRate * 1.25 : this.nitroConsumeRate;
      this.nitroAmount = Math.max(0, this.nitroAmount - burnRate * dt);
      if (this.nitroAmount <= 0) {
        this.nitroActive = false;
        this.nitroTier = 0;
      }
    } else {
      this.nitroActive = false;
      this.nitroTier = 0;
      this.isPerfectNitroReady = false;

      // Nitro recharge: faster during high-speed drifts, drafting, and high-speed cruising
      let regenFactor = 1.0;
      if (this.isDrifting) regenFactor += 2.8;
      if (this.isDrafting) regenFactor += 2.2;
      if (this.speedKmh > 200) regenFactor += 0.8;

      this.nitroAmount = Math.min(this.nitroMax, this.nitroAmount + this.nitroRechargeRate * regenFactor * dt);
    }

    // --- LOCAL VECTORS & VELOCITIES ---
    this.quaternion.setFromEuler(this.rotation);
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion).normalize();
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion).normalize();
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion).normalize();

    this.localVelocity.set(
      this.velocity.dot(this.right),
      this.velocity.dot(this.up),
      this.velocity.dot(this.forward)
    );

    this.speed = this.velocity.length();
    this.speedKmh = this.speed * 3.6;

    // --- REVERSE GEAR ENGAGEMENT ---
    let isReversing = false;
    if (brakeInput > 0.05) {
      if (this.gear !== -1) {
        if (this.localVelocity.z > 1.2) {
          isReversing = false;
        } else {
          this.gear = -1;
          isReversing = true;
        }
      } else {
        isReversing = true;
      }
    } else if (throttleInput > 0.05) {
      if (this.gear === -1) {
        if (this.localVelocity.z < -1.2) {
          isReversing = true;
        } else {
          this.gear = 1;
          isReversing = false;
        }
      } else {
        isReversing = false;
      }
    } else {
      isReversing = (this.gear === -1 && this.localVelocity.z < -0.3);
      if (Math.abs(this.localVelocity.z) < 0.2 && this.gear === -1) {
        this.gear = 1;
        isReversing = false;
      }
    }

    // --- SPEED-SENSITIVE PROGRESSIVE STEERING ---
    // Smooth reduction in steering lock at high speeds ensures precise control without twitchiness
    const speedRatio = clamp(this.speedKmh / (this.topSpeedKmh * 1.15), 0, 1);
    const speedSteerDamp = clamp(1.0 - Math.pow(speedRatio, 1.4) * 0.62, 0.38, 1.0);
    const effectiveMaxSteer = this.maxSteerAngle * speedSteerDamp;

    this.targetSteer = steerInput * effectiveMaxSteer;
    const steerSpeedMultiplier = steerInput === 0 ? 1.6 : 1.0; // Faster return-to-center spring rate
    this.steerAngle = damp(this.steerAngle, this.targetSteer, this.steerSpeed * steerSpeedMultiplier, dt);

    // --- TRANSMISSION & SHIFT DELAY ---
    if (this.shiftTimer > 0) {
      this.shiftTimer -= dt;
      if (this.shiftTimer <= 0) {
        this.isShifting = false;
      }
    }
    this.updateEngineAndGears(isReversing, dt);

    // --- DRIVING & BRAKING FORCES ---
    const nitroSpeedBoost = this.nitroTier === 2 ? this.perfectNitroMultiplier : this.nitroTier === 1 ? this.nitroMultiplier : 1.0;
    const topSpeedMs = (this.topSpeedKmh / 3.6) * nitroSpeedBoost;
    const damagePerformanceFactor = 1.0 - (this.damage / 100) * 0.22;

    let driveForceZ = 0;
    let brakeForceZ = 0;

    if (this.gear === -1) {
      // REVERSE DRIVE
      if (brakeInput > 0.05) {
        driveForceZ = -brakeInput * (this.enginePower * 14.0) * damagePerformanceFactor * effectiveSurfaceGrip;
        if (this.localVelocity.z < -16.5) driveForceZ = 0; // ~60 km/h reverse limit
      }
      if (throttleInput > 0.05 && this.localVelocity.z < -0.1) {
        brakeForceZ = Math.min(this.brakeTorque * throttleInput, Math.abs(this.localVelocity.z) * this.mass * 14);
      }
    } else {
      // FORWARD DRIVE
      if (throttleInput > 0.05 && !this.isShifting) {
        const engineTorqueFactor = this.calculateEngineTorque(this.rpm);
        const gearRatio = this.gear > 0 ? this.gearRatios[this.gear - 1] : 1.0;
        let availableForce = (this.enginePower * 15.0 * engineTorqueFactor * (gearRatio / 1.85)) * damagePerformanceFactor * effectiveSurfaceGrip;

        if (this.nitroActive) {
          availableForce *= (this.nitroTier === 2 ? 1.75 : 1.35);
        }

        const speedLimiter = clamp(1.0 - Math.pow(this.speed / topSpeedMs, 2.8), 0, 1);
        driveForceZ = throttleInput * availableForce * speedLimiter;
      } else if (throttleInput < 0.05 && this.localVelocity.z > 0.5) {
        // Realistic engine compression braking on throttle release
        const engineBrake = -((this.rpm / this.redlineRpm) * (this.mass * 0.9) * (this.gearRatios[this.gear - 1] / 2.0));
        driveForceZ = engineBrake;
      }

      // BRAKING WITH ABS PULSING ASSIST
      if (brakeInput > 0.05 && this.localVelocity.z > 0.1) {
        let effectiveBrakeInput = brakeInput;
        // ABS modulation under hard braking prevents complete lockup
        if (brakeInput > 0.72 && this.speedKmh > 35) {
          effectiveBrakeInput *= (0.88 + 0.12 * Math.sin(Date.now() * 0.045));
        }
        const brakeStrength = this.brakeTorque * effectiveBrakeInput * effectiveSurfaceGrip;
        brakeForceZ = -Math.min(brakeStrength, this.localVelocity.z * this.mass * 14);
      }
    }

    // --- AERODYNAMICS & ROLLING RESISTANCE ---
    const dragForce = -0.5 * 1.225 * this.dragCoeff * 2.2 * Math.pow(this.localVelocity.z, 2) * Math.sign(this.localVelocity.z) * this.currentSurface.dragMultiplier;
    const rollingResistance = -this.currentSurface.rollingResistance * this.localVelocity.z;
    const downforce = 0.5 * 1.225 * this.downforceCoeff * 2.2 * Math.pow(this.speed, 2);

    const totalForceZ = driveForceZ + brakeForceZ + dragForce + rollingResistance;

    // --- LATERAL TIRE DYNAMICS & DRIFT MECHANIC (Pacejka model) ---
    const totalMassDownforce = (this.mass * 9.81 + downforce) * effectiveSurfaceGrip;
    const normalForceFront = totalMassDownforce * 0.52;
    const normalForceRear = totalMassDownforce * 0.48;

    this.lateralSlip = this.localVelocity.x;
    const slipAngleRad = Math.atan2(this.lateralSlip, Math.abs(this.localVelocity.z) + 1.2);
    const slipAngleDeg = Math.abs((slipAngleRad * 180) / Math.PI);

    let rearGripMultiplier = this.tireGripRear * effectiveSurfaceGrip;
    if (handbrakeInput > 0.5) {
      rearGripMultiplier = this.driftFriction * 0.42 * effectiveSurfaceGrip;
    }

    const isDriftSpeed = this.speedKmh > 28;
    const isDriftAngle = slipAngleDeg > 10;
    const isAggressiveTurn = Math.abs(this.steerAngle) > 0.25 && this.speedKmh > 48;

    if (isDriftSpeed && (isDriftAngle || handbrakeInput > 0.5 || isAggressiveTurn)) {
      this.isDrifting = true;
      this.driftAngle = damp(this.driftAngle, slipAngleDeg, 6, dt);
      rearGripMultiplier = this.driftFriction * 0.68 * effectiveSurfaceGrip;
      this.updateDriftScore(dt);
    } else {
      if (this.isDrifting && this.currentDriftScore > 0) {
        this.driftScore += Math.round(this.currentDriftScore * this.driftMultiplier);
        this.currentDriftScore = 0;
        this.driftMultiplier = 1.0;
      }
      this.isDrifting = false;
      this.driftAngle = damp(this.driftAngle, 0, 8, dt);
    }

    const maxFrontGrip = normalForceFront * this.tireGripFront * effectiveSurfaceGrip;
    const maxRearGrip = normalForceRear * rearGripMultiplier;

    let lateralForceFront = 0;
    let lateralForceRear = 0;
    if (this.localVelocity.z < -0.1) {
      lateralForceFront = -clamp(this.lateralSlip * 2200, -maxFrontGrip, maxFrontGrip);
      lateralForceRear = -clamp(this.lateralSlip * 2200, -maxRearGrip, maxRearGrip);
    } else {
      const frontSlip = this.lateralSlip - this.steerAngle * this.localVelocity.z;
      lateralForceFront = -clamp(frontSlip * 1800, -maxFrontGrip, maxFrontGrip);
      lateralForceRear = -clamp(this.lateralSlip * 1400, -maxRearGrip, maxRearGrip);
    }

    const totalForceX = lateralForceFront + lateralForceRear;

    // --- YAW ROTATION / CORNERING MOMENT ---
    const wheelbase = 2.7;
    let steerYawRate = 0;
    if (this.localVelocity.z < -0.1) {
      steerYawRate = -(Math.abs(this.localVelocity.z) / wheelbase) * Math.sin(this.steerAngle);
    } else {
      steerYawRate = (this.localVelocity.z / wheelbase) * Math.sin(this.steerAngle);
    }

    let driftYawMoment = 0;
    if (this.isDrifting && this.localVelocity.z > 1.0) {
      const oversteerDirection = Math.sign(this.lateralSlip);
      driftYawMoment = oversteerDirection * Math.min(2.8, (this.driftAngle / 28) * 2.2);

      // Counter-steering stabilizes drift
      const counterSteer = -this.steerAngle * Math.sign(this.lateralSlip);
      if (counterSteer > 0) {
        driftYawMoment -= oversteerDirection * counterSteer * 2.5;
      }
    }

    const targetYawRate = steerYawRate + driftYawMoment;
    this.angularVelocity.y = damp(this.angularVelocity.y, targetYawRate, 14, dt);
    this.rotation.y += this.angularVelocity.y * dt;
    this.rotation.y = normalizeAngle(this.rotation.y);

    // --- ACCELERATION & VELOCITY INTEGRATION ---
    const localAccel = new THREE.Vector3(
      totalForceX / this.mass,
      0,
      totalForceZ / this.mass
    );

    const worldAccel = localAccel.applyQuaternion(this.quaternion);

    if (this.collisionImpulse.lengthSq() > 0.001) {
      worldAccel.add(this.collisionImpulse);
      this.collisionImpulse.multiplyScalar(0.7);
      if (this.collisionImpulse.lengthSq() < 0.05) this.collisionImpulse.set(0, 0, 0);
    }

    this.velocity.addScaledVector(worldAccel, dt);
    this.position.addScaledVector(this.velocity, dt);

    // --- 3D ROAD ELEVATION & SURFACE ATTACHMENT ---
    const wheelRadius = this.carDef.visuals?.wheelRadius || 0.35;
    const rideHeight = wheelRadius * 1.02;

    let roadPitch = 0;
    let roadRoll = 0;

    if (trackData && trackData.samples) {
      const closest = trackData.getClosestSample(this.position);
      if (closest && closest.sample) {
        const s = closest.sample;
        const toCar = new THREE.Vector3().subVectors(this.position, s.position);
        const lateralDist = toCar.dot(s.right);
        const roadPt = s.position.clone().addScaledVector(s.right, lateralDist);

        const targetY = roadPt.y + rideHeight;
        this.position.y = damp(this.position.y, targetY, 32, dt);
        // Absolute floor: ensure the bottom of wheels never clip beneath road plane
        this.position.y = Math.max(this.position.y, roadPt.y + wheelRadius * 0.99);

        roadPitch = -Math.asin(clamp(s.tangent.y, -0.85, 0.85));
        roadRoll = Math.asin(clamp(s.right.y, -0.85, 0.85));
      }
    } else {
      this.position.y = Math.max(this.position.y, rideHeight);
    }

    // --- SUSPENSION PITCH & ROLL COMBINED WITH ROAD ELEVATION ---
    const accelZ = localAccel.z;
    this.dynamicPitch = clamp(-accelZ * 0.008, -0.07, 0.07);

    const lateralAccel = (totalForceX / this.mass);
    this.dynamicRoll = clamp(lateralAccel * 0.006, -0.09, 0.09);

    // 4-corner suspension displacement for weight transfer
    this.suspensionCompression[0] = clamp(this.dynamicPitch - this.dynamicRoll, -0.15, 0.15); // FL
    this.suspensionCompression[1] = clamp(this.dynamicPitch + this.dynamicRoll, -0.15, 0.15); // FR
    this.suspensionCompression[2] = clamp(-this.dynamicPitch - this.dynamicRoll, -0.15, 0.15); // RL
    this.suspensionCompression[3] = clamp(-this.dynamicPitch + this.dynamicRoll, -0.15, 0.15); // RR

    this.roadPitch = damp(this.roadPitch, roadPitch, 15, dt);
    this.roadRoll = damp(this.roadRoll, roadRoll, 15, dt);
    this.rotation.x = this.roadPitch;
    this.rotation.z = this.roadRoll;

    this.pitch = this.roadPitch + this.dynamicPitch;
    this.roll = this.roadRoll + this.dynamicRoll;

    // --- WHEEL ROTATIONS ---
    const wheelCircumference = 2 * Math.PI * (this.carDef.visuals.wheelRadius || 0.35);
    const wheelDistance = this.localVelocity.z * dt;
    const wheelRotDelta = wheelDistance / wheelCircumference;
    for (let i = 0; i < 4; i++) {
      this.wheelRotations[i] += wheelRotDelta * Math.PI * 2;
    }
  }

  updateEngineAndGears(isReversing, dt) {
    if (isReversing) {
      const targetRpm = mapRange(Math.abs(this.speedKmh), 0, 50, this.idleRpm, this.redlineRpm * 0.7);
      this.rpm = damp(this.rpm, targetRpm, 6, dt);
      return;
    }

    const currentGearRatio = this.gearRatios[this.gear - 1];
    const targetWheelRpm = (this.speed / (2 * Math.PI * 0.35)) * 60;
    let expectedEngineRpm = targetWheelRpm * currentGearRatio * this.finalDrive;

    // Automatic upshift & downshift with realistic clutch shift delay
    if (this.gear < this.gearRatios.length && expectedEngineRpm > this.redlineRpm * 0.94) {
      this.gear++;
      this.isShifting = true;
      this.shiftTimer = this.shiftDuration;
      this.rpm = expectedEngineRpm * (this.gearRatios[this.gear - 1] / currentGearRatio);
    } else if (this.gear > 1 && expectedEngineRpm < this.redlineRpm * 0.42 && this.speedKmh > 10) {
      this.gear--;
      this.isShifting = true;
      this.shiftTimer = this.shiftDuration * 0.8;
      this.rpm = expectedEngineRpm * (this.gearRatios[this.gear - 1] / currentGearRatio);
    } else {
      if (this.throttle > 0.05) {
        this.rpm = damp(this.rpm, Math.max(expectedEngineRpm, this.idleRpm + this.throttle * 2500), 10, dt);
      } else {
        this.rpm = damp(this.rpm, Math.max(expectedEngineRpm, this.idleRpm), 6, dt);
      }
    }

    this.rpm = clamp(this.rpm, this.idleRpm, this.redlineRpm);
  }

  updateDriftScore(dt) {
    this.driftDuration += dt;
    const basePointsPerSec = this.driftAngle * (this.speedKmh / 20) * 18;
    this.currentDriftScore += basePointsPerSec * dt;

    // Dynamic combo multiplier based on drift duration & high angle
    if (this.driftAngle > 25 && this.speedKmh > 55) {
      this.driftMultiplier = Math.min(5.0, 1.0 + (this.driftDuration * 0.6));
    }
  }

  applyCollision(impactNormal, impactForce = 10, damageAmount = 5) {
    // Rebound impulse
    this.collisionImpulse.addScaledVector(impactNormal, impactForce);
    // Moderate damage accumulation
    this.damage = clamp(this.damage + damageAmount, 0, 100);
    // Scrub some speed
    this.velocity.multiplyScalar(0.82);
  }

  repair() {
    this.damage = 1;
  }
}
