import * as THREE from 'three';

export class SkidmarkSystem {
  constructor(scene, maxSegments = 600) {
    this.scene = scene;
    this.maxSegments = maxSegments;

    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxSegments * 6 * 3);
    this.uvs = new Float32Array(this.maxSegments * 6 * 2);
    this.alphas = new Float32Array(this.maxSegments * 6);

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));

    this.mat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.scene.add(this.mesh);

    this.currentSegment = 0;
    this.lastLeftPos = null;
    this.lastRightPos = null;
  }

  addSkid(leftPos, rightPos, intensity = 1.0) {
    if (!this.lastLeftPos || !this.lastRightPos) {
      this.lastLeftPos = leftPos.clone();
      this.lastRightPos = rightPos.clone();
      return;
    }

    const dist = leftPos.distanceTo(this.lastLeftPos);
    if (dist < 0.6) return; // don't create overly dense overlapping segments

    const segIdx = (this.currentSegment % this.maxSegments) * 18; // 6 vertices * 3 coords
    const p = this.positions;

    const yOff = 0.05;
    // Quad 2 triangles (lastLeft, lastRight, currLeft, currRight)
    // Triangle 1
    p[segIdx + 0] = this.lastLeftPos.x; p[segIdx + 1] = this.lastLeftPos.y + yOff; p[segIdx + 2] = this.lastLeftPos.z;
    p[segIdx + 3] = this.lastRightPos.x; p[segIdx + 4] = this.lastRightPos.y + yOff; p[segIdx + 5] = this.lastRightPos.z;
    p[segIdx + 6] = leftPos.x; p[segIdx + 7] = leftPos.y + yOff; p[segIdx + 8] = leftPos.z;

    // Triangle 2
    p[segIdx + 9] = this.lastRightPos.x; p[segIdx + 10] = this.lastRightPos.y + yOff; p[segIdx + 11] = this.lastRightPos.z;
    p[segIdx + 12] = rightPos.x; p[segIdx + 13] = rightPos.y + yOff; p[segIdx + 14] = rightPos.z;
    p[segIdx + 15] = leftPos.x; p[segIdx + 16] = leftPos.y + yOff; p[segIdx + 17] = leftPos.z;

    this.geo.attributes.position.needsUpdate = true;

    this.lastLeftPos.copy(leftPos);
    this.lastRightPos.copy(rightPos);
    this.currentSegment++;
  }

  resetStreak() {
    this.lastLeftPos = null;
    this.lastRightPos = null;
  }
}
