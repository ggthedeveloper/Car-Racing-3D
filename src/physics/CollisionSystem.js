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
   * Multi-point contact checks (center, front bumper, rear bumper) prevent tunneling.
   */
  resolveTrackBoundaries(vehicle, onCollisionCallback = null) {
    if (!this.trackData || !this.trackData.samples) return null;

    const carPos = vehicle.position;
    const halfRoadWidth = (this.trackData.roadWidth || 16) * 0.5;
    const carHalfWidth = (vehicle.carDef.visuals.width || 1.9) * 0.5;
    const carHalfLength = (vehicle.carDef.visuals.length || 4.4) * 0.5;

    // Contact test points: Center, Front Bumper, Rear Bumper
    const testPoints = [
      { pt: carPos, weight: 1.0 },
      { pt: carPos.clone().addScaledVector(vehicle.forward, carHalfLength * 0.85), weight: 0.8 },
      { pt: carPos.clone().addScaledVector(vehicle.forward, -carHalfLength * 0.85), weight: 0.8 }
    ];

    for (let t = 0; t < testPoints.length; t++) {
      const test = testPoints[t];
      const closest = this.trackData.getClosestSample(test.pt);
      if (!closest || !closest.sample) continue;

      const sample = closest.sample;
      const angleFactor = Math.abs(vehicle.forward.dot(sample.right));
      const effectiveHalfWidth = carHalfWidth + (carHalfLength - carHalfWidth) * angleFactor;
      const maxAllowedDist = Math.max(0.4, halfRoadWidth - effectiveHalfWidth * 0.95);

      const toCar = new THREE.Vector3().subVectors(test.pt, sample.position);
      const lateralDist = toCar.dot(sample.right);

      if (Math.abs(lateralDist) > maxAllowedDist) {
        const penetration = Math.abs(lateralDist) - maxAllowedDist;
        const barrierSide = Math.sign(lateralDist);
        const normal = sample.right.clone().multiplyScalar(-barrierSide);

        // Push car back inside boundary smoothly
        vehicle.position.addScaledVector(normal, penetration * 1.08 * test.weight);

        // Velocity component into barrier
        const velIntoBarrier = vehicle.velocity.dot(normal);
        if (velIntoBarrier < 0) {
          vehicle.velocity.sub(normal.clone().multiplyScalar(velIntoBarrier));

          // Impact bounce
          if (velIntoBarrier < -1.2) {
            const impactSpeed = Math.abs(velIntoBarrier);
            const restitution = 0.32;
            vehicle.velocity.addScaledVector(normal, impactSpeed * restitution);
            vehicle.applyCollision(normal, impactSpeed * 0.5, Math.min(14, impactSpeed * 0.5));

            if (onCollisionCallback) {
              onCollisionCallback({
                position: test.pt.clone(),
                normal: normal.clone(),
                intensity: impactSpeed / 18.0,
                type: 'barrier'
              });
            }

            return { collided: true, type: 'barrier', normal, intensity: impactSpeed };
          }
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

  /**
   * Check and resolve collision with a civilian traffic car.
   * Also detects near-misses for nitro reward!
   */
  resolveVehicleTraffic(veh, trafficCar, onCollisionCallback = null) {
    const distSq = veh.position.distanceToSquared(trafficCar.position);
    const radiusVeh = 1.3;
    const radiusTraffic = trafficCar.collisionRadius || 1.4;
    const minDistance = radiusVeh + radiusTraffic;

    // Near miss detection (close pass within 2.8m without collision)
    if (distSq < 10.0 && distSq >= minDistance * minDistance) {
      if (!trafficCar.nearMissRecorded && veh.speedKmh > 75) {
        trafficCar.nearMissRecorded = true;
        // Reward player with instant nitro boost
        if (veh.nitroAmount !== undefined) {
          veh.nitroAmount = Math.min(veh.nitroMax || 100, veh.nitroAmount + 14);
        }
        return { nearMiss: true };
      }
    }

    if (distSq < minDistance * minDistance && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDistance - dist;
      const normal = new THREE.Vector3().subVectors(veh.position, trafficCar.position).normalize();

      const trafficMass = trafficCar.mass || 1600;
      const totalMass = veh.mass + trafficMass;
      const massRatioVeh = trafficMass / totalMass;
      const massRatioTraffic = veh.mass / totalMass;

      veh.position.addScaledVector(normal, overlap * massRatioVeh * 1.08);
      trafficCar.position.addScaledVector(normal, -overlap * massRatioTraffic * 1.08);

      const relVel = new THREE.Vector3().subVectors(veh.velocity, trafficCar.velocity);
      const velAlongNormal = relVel.dot(normal);

      if (velAlongNormal < 0) {
        const restitution = 0.40;
        const impulseMagnitude = -(1 + restitution) * velAlongNormal / (1 / veh.mass + 1 / trafficMass);
        const impulse = normal.clone().multiplyScalar(impulseMagnitude);

        veh.velocity.addScaledVector(impulse, 1 / veh.mass);
        trafficCar.velocity.addScaledVector(impulse, -1 / trafficMass);

        const impactIntensity = Math.abs(velAlongNormal);
        veh.applyCollision(normal, impactIntensity * 0.45, Math.min(12, impactIntensity * 0.45));

        if (onCollisionCallback) {
          const contactPt = new THREE.Vector3().addVectors(veh.position, trafficCar.position).multiplyScalar(0.5);
          onCollisionCallback({
            position: contactPt,
            normal: normal.clone(),
            intensity: impactIntensity / 15.0,
            type: 'traffic'
          });
        }

        return { collided: true, type: 'traffic', intensity: impactIntensity };
      }
    }

    return null;
  }
}
