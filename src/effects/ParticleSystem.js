import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // 1. Tire Smoke System (Object Pooled)
    this.maxSmoke = 120;
    this.smokeParticles = [];
    this.smokeGeo = new THREE.PlaneGeometry(0.8, 0.8);
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    for (let i = 0; i < this.maxSmoke; i++) {
      const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 0.8,
        velocity: new THREE.Vector3(),
        scale: 0.4
      });
    }

    // 2. Nitro Exhaust Flames
    this.flameGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
    this.flameGeo.rotateX(-Math.PI / 2);
    this.flameMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.9
    });
    this.leftFlame = new THREE.Mesh(this.flameGeo, this.flameMat);
    this.rightFlame = new THREE.Mesh(this.flameGeo, this.flameMat);
    this.leftFlame.visible = false;
    this.rightFlame.visible = false;
    this.scene.add(this.leftFlame);
    this.scene.add(this.rightFlame);

    // 3. Collision Sparks System
    this.maxSparks = 80;
    this.sparkParticles = [];
    this.sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    for (let i = 0; i < this.maxSparks; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkParticles.push({
        mesh,
        life: 0,
        maxLife: 0.4,
        velocity: new THREE.Vector3()
      });
    }

    // 4. Rain Particles (Camera Follow Volume)
    this.rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      rainPositions[i * 3 + 1] = Math.random() * 30;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.15,
      transparent: true,
      opacity: 0.6
    });
    this.rainPoints = new THREE.Points(rainGeo, this.rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  emitTireSmoke(position, velocity, intensity = 1.0) {
    const p = this.smokeParticles.find((part) => part.life <= 0);
    if (!p) return;

    p.life = p.maxLife;
    p.scale = 0.3 * intensity;
    p.mesh.position.copy(position);
    p.mesh.position.y += 0.2;
    p.mesh.scale.set(p.scale, p.scale, p.scale);
    p.mesh.material.opacity = 0.5 * intensity;
    p.mesh.visible = true;

    p.velocity.set(
      (Math.random() - 0.5) * 1.5,
      0.8 + Math.random() * 0.8,
      (Math.random() - 0.5) * 1.5
    );
  }

  emitCollisionSparks(position, normal, count = 12) {
    let emitted = 0;
    for (let i = 0; i < this.sparkParticles.length && emitted < count; i++) {
      const p = this.sparkParticles[i];
      if (p.life <= 0) {
        p.life = p.maxLife * (0.6 + Math.random() * 0.4);
        p.mesh.position.copy(position);
        p.mesh.visible = true;

        // Scatter velocity outwards along normal with random cone
        p.velocity.copy(normal).multiplyScalar(8 + Math.random() * 12);
        p.velocity.x += (Math.random() - 0.5) * 10;
        p.velocity.y += Math.random() * 8;
        p.velocity.z += (Math.random() - 0.5) * 10;

        emitted++;
      }
    }
  }

  updateNitroFlames(leftPos, rightPos, forwardDir, isNitroActive) {
    if (isNitroActive && leftPos && rightPos) {
      this.leftFlame.visible = true;
      this.rightFlame.visible = true;

      this.leftFlame.position.copy(leftPos);
      this.rightFlame.position.copy(rightPos);

      // Point backwards along car forward vector
      const flameDir = forwardDir.clone().negate();
      const lookTargetLeft = leftPos.clone().add(flameDir);
      const lookTargetRight = rightPos.clone().add(flameDir);
      this.leftFlame.lookAt(lookTargetLeft);
      this.rightFlame.lookAt(lookTargetRight);

      // Flicker scale
      const flicker = 0.8 + Math.random() * 0.4;
      this.leftFlame.scale.set(flicker, flicker, flicker * 1.3);
      this.rightFlame.scale.set(flicker, flicker, flicker * 1.3);
    } else {
      this.leftFlame.visible = false;
      this.rightFlame.visible = false;
    }
  }

  update(dt, cameraPosition, isRaining = false) {
    // 1. Update Smoke
    for (let i = 0; i < this.smokeParticles.length; i++) {
      const p = this.smokeParticles[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.scale += dt * 1.4;
          p.mesh.scale.set(p.scale, p.scale, p.scale);
          p.mesh.material.opacity = (p.life / p.maxLife) * 0.45;
          p.mesh.lookAt(cameraPosition);
        }
      }
    }

    // 2. Update Sparks
    for (let i = 0; i < this.sparkParticles.length; i++) {
      const p = this.sparkParticles[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.velocity.y -= 25.0 * dt; // gravity
          p.mesh.position.addScaledVector(p.velocity, dt);
        }
      }
    }

    // 3. Update Rain Volume
    if (isRaining && cameraPosition) {
      this.rainPoints.visible = true;
      this.rainPoints.position.copy(cameraPosition);
      const positions = this.rainPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        positions[i * 3 + 1] -= dt * 45; // fall down fast
        if (positions[i * 3 + 1] < -15) {
          positions[i * 3 + 1] = 18;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    } else {
      this.rainPoints.visible = false;
    }
  }
}
