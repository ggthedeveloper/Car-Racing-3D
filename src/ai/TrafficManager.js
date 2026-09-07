import * as THREE from 'three';
import { clamp, damp } from '../utils/math.js';

export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.trafficCars = [];
    this.carMeshes = [];
  }

  spawnTraffic(trackData, count = 12) {
    this.cleanup();
    if (!trackData || !trackData.samples || trackData.samples.length === 0) return;

    const samples = trackData.samples;
    const roadWidth = trackData.roadWidth || 16.0;
    const laneOffsets = [-roadWidth * 0.28, roadWidth * 0.28]; // Two cruising lanes

    const carColors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x6b7280, 0xf8fafc, 0x1e293b];
    const types = ['sedan', 'suv', 'van'];

    const stepInterval = Math.floor(samples.length / count);

    for (let i = 0; i < count; i++) {
      const sampleIdx = (i * stepInterval + Math.floor(Math.random() * 8)) % samples.length;
      const s = samples[sampleIdx];
      const lane = laneOffsets[i % laneOffsets.length];
      const type = types[i % types.length];
      const color = carColors[i % carColors.length];

      const mesh = this.createTrafficMesh(type, color);
      this.scene.add(mesh);

      const cruisingSpeedKmh = 75 + Math.random() * 35; // 75 - 110 km/h
      const cruisingSpeedMs = cruisingSpeedKmh / 3.6;

      const pos = s.position.clone().addScaledVector(s.right, lane);
      pos.y += 0.35;
      mesh.position.copy(pos);

      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      mesh.rotation.y = yaw;

      this.trafficCars.push({
        id: `traffic_${i}`,
        type,
        mesh,
        sampleIdx,
        laneOffset: lane,
        targetLane: lane,
        cruisingSpeed: cruisingSpeedMs,
        speed: cruisingSpeedMs,
        speedKmh: cruisingSpeedKmh,
        position: pos,
        velocity: s.tangent.clone().multiplyScalar(cruisingSpeedMs),
        forward: s.tangent.clone(),
        mass: type === 'van' ? 2400 : type === 'suv' ? 1900 : 1500,
        collisionRadius: type === 'van' ? 1.55 : 1.35,
        nearMissRecorded: false,
        applyCollision: (normal, force) => {
          // Push traffic car slightly on impact
        }
      });
    }
  }

  createTrafficMesh(type, colorHex) {
    const group = new THREE.Group();
    group.name = `Traffic_${type}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.7
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.1,
      metalness: 0.9
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.8
    });

    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    let len = 4.2;
    let wid = 1.8;
    let hgt = 1.35;

    if (type === 'suv') {
      len = 4.5;
      wid = 1.95;
      hgt = 1.6;
    } else if (type === 'van') {
      len = 5.0;
      wid = 2.0;
      hgt = 1.9;
    }

    // Main body box
    const bodyGeo = new THREE.BoxGeometry(wid, hgt * 0.5, len);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = hgt * 0.35;
    group.add(body);

    // Cabin glass box
    const cabinLen = type === 'van' ? len * 0.75 : len * 0.55;
    const cabinHgt = hgt * 0.45;
    const cabinGeo = new THREE.BoxGeometry(wid * 0.88, cabinHgt, cabinLen);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, hgt * 0.35 + cabinHgt * 0.5, -len * 0.05);
    group.add(cabin);

    // Headlights
    [-0.35, 0.35].forEach((xOff) => {
      const hGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
      const hl = new THREE.Mesh(hGeo, headMat);
      hl.position.set(xOff * wid, hgt * 0.35, len * 0.505);
      group.add(hl);
    });

    // Taillights
    [-0.35, 0.35].forEach((xOff) => {
      const tGeo = new THREE.BoxGeometry(0.28, 0.14, 0.05);
      const tl = new THREE.Mesh(tGeo, tailMat);
      tl.position.set(xOff * wid, hgt * 0.38, -len * 0.505);
      group.add(tl);
    });

    // 4 Wheels
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
    wGeo.rotateZ(Math.PI / 2);
    [
      [-wid * 0.5, len * 0.3],
      [wid * 0.5, len * 0.3],
      [-wid * 0.5, -len * 0.3],
      [wid * 0.5, -len * 0.3]
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wGeo, wheelMat);
      wheel.position.set(wx, 0.32, wz);
      group.add(wheel);
    });

    return group;
  }

  update(dt, trackData, playerPos) {
    if (!trackData || !trackData.samples || this.trafficCars.length === 0) return;

    const samples = trackData.samples;
    const totalSamples = samples.length;

    for (let i = 0; i < this.trafficCars.length; i++) {
      const car = this.trafficCars[i];

      // Step along spline
      const sampleDist = samples[car.sampleIdx].position.distanceTo(samples[(car.sampleIdx + 1) % totalSamples].position);
      const stepFraction = (car.speed * dt) / Math.max(0.5, sampleDist);

      // Advance sample index
      if (stepFraction >= 1.0) {
        car.sampleIdx = (car.sampleIdx + Math.floor(stepFraction)) % totalSamples;
      } else {
        // Continuous interpolation
        car.sampleIdx = (car.sampleIdx + 1) % totalSamples;
      }

      const s = samples[car.sampleIdx];
      const targetPos = s.position.clone().addScaledVector(s.right, car.laneOffset);
      targetPos.y += 0.35;

      car.position.lerp(targetPos, 0.4);
      car.mesh.position.copy(car.position);

      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      car.mesh.rotation.y = yaw;
      car.forward.copy(s.tangent);
      car.velocity.copy(s.tangent).multiplyScalar(car.speed);

      // Reset near miss state when far away from player
      if (playerPos && car.position.distanceToSquared(playerPos) > 100) {
        car.nearMissRecorded = false;
      }
    }
  }

  cleanup() {
    this.trafficCars.forEach((c) => {
      if (c.mesh && c.mesh.parent) {
        c.mesh.parent.remove(c.mesh);
      }
    });
    this.trafficCars = [];
  }
}
