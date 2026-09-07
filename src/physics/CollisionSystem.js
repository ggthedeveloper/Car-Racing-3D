import * as THREE from 'three';

export class CollisionSystem {
  constructor(trackData) {
    this.trackData = trackData; // { roadWidth, splineSamples, ... }
  }

  setTrackData(trackData) {
    this.trackData = trackData;
  }

  /**
   * Check and resolve collisions between vehicle and track boundaries/barriers.
   * Returns collision info if collision occurred.
   */
  resolveTrackBoundaries(vehicle, onCollisionCallback = null) {
    if (!this.trackData || !this.trackData.samples) return null;

    const carPos = vehicle.position;
    const closest = this.trackData.getClosestSample(carPos);
    if (!closest || !closest.sample) return null;

    const sample = closest.sample;
    const halfRoadWidth = (this.trackData.roadWidth || 16) * 0.5;
    const carHalfWidth = (vehicle.carDef.visuals.width || 1.9) * 0.5;
    const carHalfLength = (vehicle.carDef.visuals.length || 4.4) * 0.5;
    // Account for car yaw angle relative to track barrier
    const angleFactor = Math.abs(vehicle.forward.dot(sample.right));
    const effectiveHalfWidth = carHalfWidth + (carHalfLength - carHalfWidth) * angleFactor;
    const maxAllowedDist = Math.max(0.5, halfRoadWidth - effectiveHalfWidth);

    // Vector from track center to car
    const toCar = new THREE.Vector3().subVectors(carPos, sample.position);
    // Project onto track right vector (perpendicular to racing line)
    const lateralDist = toCar.dot(sample.right);

    if (Math.abs(lateralDist) > maxAllowedDist) {
      // Car has hit the barrier!
      const penetration = Math.abs(lateralDist) - maxAllowedDist;
      const barrierSide = Math.sign(lateralDist); // +1 right barrier, -1 left barrier

      // Collision normal points away from barrier towards road center
      const normal = sample.right.clone().multiplyScalar(-barrierSide);

      // Push car back inside boundary smoothly
      vehicle.position.addScaledVector(normal, penetration * 1.05);

      // Velocity component along the barrier normal (negative = moving towards barrier)
      const velIntoBarrier = vehicle.velocity.dot(normal);
      if (velIntoBarrier < 0) {
        // Cancel velocity into barrier so car NEVER gets stuck
        vehicle.velocity.sub(normal.clone().multiplyScalar(velIntoBarrier));

        // Hard impact bounce & feedback
        if (velIntoBarrier < -1.5) {
          const impactSpeed = Math.abs(velIntoBarrier);
          const restitution = 0.35;
          vehicle.velocity.addScaledVector(normal, impactSpeed * restitution);
          vehicle.applyCollision(normal, impactSpeed * 0.5, Math.min(15, impactSpeed * 0.6));

          if (onCollisionCallback) {
            onCollisionCallback({
              position: carPos.clone(),
              normal: normal.clone(),
              intensity: impactSpeed / 20.0,
              type: 'barrier'
            });
          }

          return { collided: true, type: 'barrier', normal, intensity: impactSpeed };
        }
      }
    }

    return null;
  }

  /**
   * Check and resolve collisions between two vehicles (e.g. Player and AI, or AI and AI)
   */
  resolveVehicleVehicle(vehA, vehB, onCollisionCallback = null) {
    const distSq = vehA.position.distanceToSquared(vehB.position);
    const radiusA = 1.3;
    const radiusB = 1.3;
    const minDistance = radiusA + radiusB;

    if (distSq < minDistance * minDistance && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDistance - dist;

      // Normal pointing from B to A
      const normal = new THREE.Vector3().subVectors(vehA.position, vehB.position).normalize();

      // Separate them based on mass ratio
      const totalMass = vehA.mass + vehB.mass;
      const massRatioA = vehB.mass / totalMass;
      const massRatioB = vehA.mass / totalMass;

      vehA.position.addScaledVector(normal, overlap * massRatioA * 1.05);
      vehB.position.addScaledVector(normal, -overlap * massRatioB * 1.05);

      // Relative velocity
      const relVel = new THREE.Vector3().subVectors(vehA.velocity, vehB.velocity);
      const velAlongNormal = relVel.dot(normal);

      if (velAlongNormal < 0) {
        const restitution = 0.45;
        const impulseMagnitude = -(1 + restitution) * velAlongNormal / (1 / vehA.mass + 1 / vehB.mass);
        const impulse = normal.clone().multiplyScalar(impulseMagnitude);

        vehA.velocity.addScaledVector(impulse, 1 / vehA.mass);
        vehB.velocity.addScaledVector(impulse, -1 / vehB.mass);

        const impactIntensity = Math.abs(velAlongNormal);
        vehA.applyCollision(normal, impactIntensity * 0.4, Math.min(10, impactIntensity * 0.4));
        vehB.applyCollision(normal.clone().negate(), impactIntensity * 0.4, Math.min(10, impactIntensity * 0.4));

        if (onCollisionCallback) {
          const contactPt = new THREE.Vector3().addVectors(vehA.position, vehB.position).multiplyScalar(0.5);
          onCollisionCallback({
            position: contactPt,
            normal: normal.clone(),
            intensity: impactIntensity / 15.0,
            type: 'vehicle'
          });
        }

        return { collided: true, type: 'vehicle', intensity: impactIntensity };
      }
    }

    return null;
  }
}
