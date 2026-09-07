import * as THREE from 'three';
import { clamp, lerp, damp, mapRange, normalizeAngle } from '../utils/math.js';

export class VehiclePhysics {
  constructor(carDef, upgrades = {}) {
    this.carDef = carDef;
    this.upgrades = upgrades;

    // Apply upgrade modifiers to base stats
    this.applyUpgrades();

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
    this.gear = 1; // 1 to 6, -1 is Reverse, 0 is Neutral
    this.rpm = this.idleRpm;
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = 0;
    this.isShifting = false;
    this.shiftTimer = 0;

    // Nitro
    this.nitroActive = false;
    this.nitroAmount = 100; // 0 to 100%
    this.nitroMax = 100;
    this.nitroRechargeRate = 4.5; // % per second
    this.nitroConsumeRate = 22.0; // % per second

    // Drift system
    this.isDrifting = false;
    this.driftAngle = 0; // in degrees
    this.driftScore = 0;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.driftDuration = 0;
    this.driftComboTimer = 0;
    this.lateralSlip = 0;

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

    // Apply upgrade modifiers
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

    this.nitroMultiplier = 1.35 + nitroLvl * 0.15;
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
  }

  update(inputs, dt, surfaceFriction = 1.0, trackData = null) {
    if (dt <= 0 || isNaN(dt)) return;
    dt = Math.min(dt, 0.05); // prevent physics simulation explosion on frame drop

    // Parse player/AI inputs
    const throttleInput = clamp(inputs.throttle || 0, 0, 1);
    const brakeInput = clamp(inputs.brake || 0, 0, 1);
    const steerInput = clamp(inputs.steer || 0, -1, 1);
    const handbrakeInput = inputs.handbrake ? 1 : 0;
    const nitroInput = inputs.nitro && this.nitroAmount > 5;

    this.throttle = throttleInput;
    this.brake = brakeInput;
    this.handbrake = handbrakeInput;

    // --- NITRO SYSTEM ---
    if (nitroInput && throttleInput > 0.2 && this.nitroAmount > 0) {
      this.nitroActive = true;
      this.nitroAmount = Math.max(0, this.nitroAmount - this.nitroConsumeRate * dt);
    } else {
      this.nitroActive = false;
      // Nitro regenerates on clean driving, faster during drift
      const regenBoost = this.isDrifting ? 2.5 : 1.0;
      this.nitroAmount = Math.min(this.nitroMax, this.nitroAmount + this.nitroRechargeRate * regenBoost * dt);
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
          // Still moving forward with speed: apply brakes
          isReversing = false;
        } else {
          // Slowed down or stopped: shift into reverse!
          this.gear = -1;
          isReversing = true;
        }
      } else {
        // Already in reverse: maintain reverse
        isReversing = true;
      }
    } else if (throttleInput > 0.05) {
      if (this.gear === -1) {
        if (this.localVelocity.z < -1.2) {
          // Still reversing with speed: brake backward motion
          isReversing = true;
        } else {
          // Stopped reversing: shift into 1st gear forward!
          this.gear = 1;
          isReversing = false;
        }
      } else {
        isReversing = false;
      }
    } else {
      // Coasting
      isReversing = (this.gear === -1 && this.localVelocity.z < -0.3);
      if (Math.abs(this.localVelocity.z) < 0.2 && this.gear === -1) {
        this.gear = 1;
        isReversing = false;
      }
    }

    // --- STEERING DYNAMICS ---
    // High-speed steering dampening for realistic control
    const speedRatio = clamp(this.speedKmh / this.topSpeedKmh, 0, 1);
    const speedSteerDamp = mapRange(speedRatio, 0, 1, 1.0, 0.42);
    const effectiveMaxSteer = this.maxSteerAngle * speedSteerDamp;

    this.targetSteer = steerInput * effectiveMaxSteer;
    this.steerAngle = damp(this.steerAngle, this.targetSteer, this.steerSpeed, dt);

    // --- TRANSMISSION & ENGINE RPM ---
    this.updateEngineAndGears(isReversing, dt);

    // --- DRIVING FORCES ---
    const topSpeedMs = (this.topSpeedKmh / 3.6) * (this.nitroActive ? this.nitroMultiplier * 1.08 : 1.0);
    const damagePerformanceFactor = 1.0 - (this.damage / 100) * 0.22;

    let driveForceZ = 0;
    let brakeForceZ = 0;

    if (this.gear === -1) {
      // IN REVERSE:
      // brakeInput accelerates in reverse with strong torque
      if (brakeInput > 0.05) {
        driveForceZ = -brakeInput * (this.enginePower * 14.0) * damagePerformanceFactor;
        if (this.localVelocity.z < -16.0) driveForceZ = 0; // top reverse speed ~58 km/h
      }
      // throttleInput brakes reverse motion
      if (throttleInput > 0.05 && this.localVelocity.z < -0.1) {
        brakeForceZ = Math.min(this.brakeTorque * throttleInput, Math.abs(this.localVelocity.z) * this.mass * 14);
      }
    } else {
      // IN FORWARD:
      // throttleInput accelerates forward
      if (throttleInput > 0.05) {
        const rpmPowerRatio = mapRange(this.rpm, this.idleRpm, this.redlineRpm, 0.65, 1.0);
        const gearRatio = this.gear > 0 ? this.gearRatios[this.gear - 1] : 1.0;
        let availableForce = (this.enginePower * 14.5 * rpmPowerRatio * (gearRatio / 1.8)) * damagePerformanceFactor;

        if (this.nitroActive) {
          availableForce *= this.nitroMultiplier;
        }

        const speedLimiter = clamp(1.0 - Math.pow(this.speed / topSpeedMs, 2.5), 0, 1);
        driveForceZ = throttleInput * availableForce * speedLimiter;
      }
      // brakeInput brakes forward motion
      if (brakeInput > 0.05 && this.localVelocity.z > 0.1) {
        const brakeStrength = this.brakeTorque * brakeInput;
        brakeForceZ = -Math.min(brakeStrength, this.localVelocity.z * this.mass * 14);
      }
    }

    // --- AERODYNAMICS & ROLLING RESISTANCE ---
    const dragForce = -0.5 * 1.225 * this.dragCoeff * 2.2 * Math.pow(this.localVelocity.z, 2) * Math.sign(this.localVelocity.z);
    const rollingResistance = -28.0 * this.localVelocity.z;
    const downforce = 0.5 * 1.225 * this.downforceCoeff * 2.2 * Math.pow(this.speed, 2);

    // Total longitudinal force
    const totalForceZ = driveForceZ + brakeForceZ + dragForce + rollingResistance;

    // --- LATERAL TIRE DYNAMICS & DRIFT MECHANIC ---
    const totalMassDownforce = (this.mass * 9.81 + downforce) * surfaceFriction;
    const normalForceFront = totalMassDownforce * 0.52;
    const normalForceRear = totalMassDownforce * 0.48;

    // Lateral slip velocity
    this.lateralSlip = this.localVelocity.x;
    const slipAngleRad = Math.atan2(this.lateralSlip, Math.abs(this.localVelocity.z) + 1.2);
    const slipAngleDeg = Math.abs((slipAngleRad * 180) / Math.PI);

    // Handbrake initiates instant rear drift lockup
    let rearGripMultiplier = this.tireGripRear;
    if (handbrakeInput > 0.5) {
      rearGripMultiplier = this.driftFriction * 0.45;
    }

    // Detect drift state
    const isDriftSpeed = this.speedKmh > 32;
    const isDriftAngle = slipAngleDeg > 12;
    const isAggressiveTurn = Math.abs(this.steerAngle) > 0.28 && this.speedKmh > 55;

    if (isDriftSpeed && (isDriftAngle || handbrakeInput > 0.5 || isAggressiveTurn)) {
      this.isDrifting = true;
      this.driftAngle = damp(this.driftAngle, slipAngleDeg, 6, dt);
      rearGripMultiplier = this.driftFriction * 0.72;
      this.updateDriftScore(dt);
    } else {
      if (this.isDrifting && this.currentDriftScore > 0) {
        // Bank current drift score into total
        this.driftScore += Math.round(this.currentDriftScore * this.driftMultiplier);
        this.currentDriftScore = 0;
        this.driftMultiplier = 1.0;
      }
      this.isDrifting = false;
      this.driftAngle = damp(this.driftAngle, 0, 8, dt);
    }

    // Lateral tire forces (Pacejka lateral friction model)
    const maxFrontGrip = normalForceFront * this.tireGripFront;
    const maxRearGrip = normalForceRear * rearGripMultiplier;

    let lateralForceFront = 0;
    let lateralForceRear = 0;
    if (this.localVelocity.z < -0.1) {
      // Reversing: direct lateral damping keeps reversing stable and prevents wedging
      lateralForceFront = -clamp(this.lateralSlip * 2200, -maxFrontGrip, maxFrontGrip);
      lateralForceRear = -clamp(this.lateralSlip * 2200, -maxRearGrip, maxRearGrip);
    } else {
      const frontSlip = this.lateralSlip - this.steerAngle * this.localVelocity.z;
      lateralForceFront = -clamp(frontSlip * 1800, -maxFrontGrip, maxFrontGrip);
      lateralForceRear = -clamp(this.lateralSlip * 1400, -maxRearGrip, maxRearGrip);
    }

    const totalForceX = lateralForceFront + lateralForceRear;

    // --- YAW ROTATION / CORNERING MOMENT ---
    // Steering produces yaw moment; rear drift slip adds rotational oversteer
    const wheelbase = 2.7; // meters
    let steerYawRate = 0;
    if (this.localVelocity.z < -0.1) {
      steerYawRate = -(Math.abs(this.localVelocity.z) / wheelbase) * Math.sin(this.steerAngle);
    } else {
      steerYawRate = (this.localVelocity.z / wheelbase) * Math.sin(this.steerAngle);
    }
    
    // Oversteer moment during drift (only when moving forward)
    let driftYawMoment = 0;
    if (this.isDrifting && this.localVelocity.z > 1.0) {
      const oversteerDirection = Math.sign(this.lateralSlip);
      driftYawMoment = oversteerDirection * Math.min(2.8, (this.driftAngle / 28) * 2.2);

      // Counter-steering stabilization: steering into the slide stabilizes the drift
      const counterSteer = -this.steerAngle * Math.sign(this.lateralSlip);
      if (counterSteer > 0) {
        driftYawMoment -= oversteerDirection * counterSteer * 2.4;
      }
    }

    const targetYawRate = steerYawRate + driftYawMoment;
    this.angularVelocity.y = damp(this.angularVelocity.y, targetYawRate, 14, dt);
    this.rotation.y += this.angularVelocity.y * dt;
    this.rotation.y = normalizeAngle(this.rotation.y);

    // --- INTEGRATE ACCELERATION & VELOCITY ---
    const localAccel = new THREE.Vector3(
      totalForceX / this.mass,
      0,
      totalForceZ / this.mass
    );

    // Convert local acceleration to world frame
    const worldAccel = localAccel.applyQuaternion(this.quaternion);
    
    // Add collision impulses if any
    if (this.collisionImpulse.lengthSq() > 0.001) {
      worldAccel.add(this.collisionImpulse);
      this.collisionImpulse.multiplyScalar(0.7); // Rapid decay
      if (this.collisionImpulse.lengthSq() < 0.05) this.collisionImpulse.set(0, 0, 0);
    }

    this.velocity.addScaledVector(worldAccel, dt);

    // Integrate position
    this.position.addScaledVector(this.velocity, dt);

    // --- 3D ROAD ELEVATION & SURFACE ATTACHMENT ---
    const wheelRadius = this.carDef.visuals.wheelRadius || 0.35;
    const rideHeight = wheelRadius * 0.95;

    let roadPitch = 0;
    let roadRoll = 0;

    if (trackData && trackData.samples) {
      const closest = trackData.getClosestSample(this.position);
      if (closest && closest.sample) {
        const s = closest.sample;
        const toCar = new THREE.Vector3().subVectors(this.position, s.position);
        const lateralDist = toCar.dot(s.right);
        const roadPt = s.position.clone().addScaledVector(s.right, lateralDist);

        // Target Y on top of road plane
        const targetY = roadPt.y + rideHeight;
        // Smooth suspension compliance to road surface
        this.position.y = damp(this.position.y, targetY, 28, dt);
        // Absolute hard floor clamp: car can NEVER penetrate below road surface!
        this.position.y = Math.max(this.position.y, roadPt.y + rideHeight * 0.9);

        // Road slope (pitch) and banking (roll)
        roadPitch = -Math.asin(clamp(s.tangent.y, -0.85, 0.85));
        roadRoll = Math.asin(clamp(s.right.y, -0.85, 0.85));
      }
    } else {
      // Default flat plane floor (showroom / fallback)
      this.position.y = Math.max(this.position.y, rideHeight);
    }

    // --- SUSPENSION PITCH & ROLL COMBINED WITH ROAD ELEVATION ---
    const accelZ = localAccel.z;
    this.dynamicPitch = clamp(-accelZ * 0.008, -0.07, 0.07);

    const lateralAccel = (totalForceX / this.mass);
    this.dynamicRoll = clamp(lateralAccel * 0.006, -0.09, 0.09);

    // Root chassis rotation follows road grade and banking
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

    // Automatic upshift & downshift
    if (this.gear < this.gearRatios.length && expectedEngineRpm > this.redlineRpm * 0.94) {
      this.gear++;
      this.rpm = expectedEngineRpm * (this.gearRatios[this.gear - 1] / currentGearRatio);
    } else if (this.gear > 1 && expectedEngineRpm < this.redlineRpm * 0.42 && this.speedKmh > 10) {
      this.gear--;
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
    this.damage = 0;
  }
}
