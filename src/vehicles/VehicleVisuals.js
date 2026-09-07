import * as THREE from 'three';

export class VehicleVisuals {
  constructor(carMeshObj) {
    this.meshObj = carMeshObj;
    this.root = carMeshObj.root;
    this.bodyGroup = carMeshObj.bodyGroup;
    this.wheelNodes = carMeshObj.wheelNodes;
    this.headlightMat = carMeshObj.headlightOffMat;
    this.taillightMat = carMeshObj.taillightMat;
    this.reverseLightMat = carMeshObj.reverseLightMat;
    this.spotLeft = carMeshObj.headLightSpotLeft;
    this.spotRight = carMeshObj.headLightSpotRight;
    this.paintMat = carMeshObj.paintMaterial;

    this.headlightsOn = false;
  }

  setHeadlights(enabled) {
    this.headlightsOn = enabled;
    if (this.spotLeft && this.spotRight) {
      this.spotLeft.intensity = enabled ? 2.5 : 0;
      this.spotRight.intensity = enabled ? 2.5 : 0;
    }
    if (this.headlightMat) {
      this.headlightMat.emissiveIntensity = enabled ? 2.0 : 0.4;
      this.headlightMat.color.setHex(enabled ? 0xffffff : 0xddffff);
    }
  }

  update(physics, isNightOrFog = false) {
    if (!this.root || !physics) return;

    // 1. Sync Root Transform
    this.root.position.copy(physics.position);
    this.root.rotation.copy(physics.rotation);

    // 2. Suspension Tilt & Roll on Car Body (relative to chassis root)
    if (this.bodyGroup) {
      this.bodyGroup.rotation.x = physics.dynamicPitch || 0;
      this.bodyGroup.rotation.z = -(physics.dynamicRoll || 0);
      // Slight vertical compression on bumps/landing
      this.bodyGroup.position.y = (physics.carDef.visuals.wheelRadius || 0.35) * 0.85;
    }

    // 3. Wheel Steering & Rotations
    if (this.wheelNodes) {
      this.wheelNodes.forEach((wheel, index) => {
        // Front wheels turn left/right
        if (wheel.isFront && wheel.steerPivot) {
          wheel.steerPivot.rotation.y = physics.steerAngle;
        }
        // All wheels spin forward/backward
        if (wheel.spinGroup) {
          wheel.spinGroup.rotation.x = physics.wheelRotations[index] || 0;
        }
      });
    }

    // 4. Brake & Reverse Light Logic
    const isBraking = physics.brake > 0.08 && physics.gear > 0;
    const isReversing = physics.gear === -1;

    if (this.taillightMat) {
      if (isBraking) {
        this.taillightMat.emissive.setHex(0xff0022);
        this.taillightMat.emissiveIntensity = 3.2; // intense brake glow
      } else {
        this.taillightMat.emissive.setHex(0x880011);
        this.taillightMat.emissiveIntensity = 0.8;
      }
    }

    if (this.reverseLightMat) {
      this.reverseLightMat.emissiveIntensity = isReversing ? 2.5 : 0.0;
    }

    // Headlight auto-state based on environment
    if (isNightOrFog !== this.headlightsOn) {
      this.setHeadlights(isNightOrFog);
    }

    // 5. Visual Damage: adjust body tilt or paint roughness if damaged
    if (physics.damage > 20 && this.bodyGroup) {
      const damageWobble = Math.sin(Date.now() * 0.01) * (physics.damage / 100) * 0.004;
      this.bodyGroup.rotation.z += damageWobble;
    }
  }

  dispose() {
    if (this.root && this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
