import * as THREE from 'three';

export class WeatherManager {
  constructor(scene, roadMaterial = null) {
    this.scene = scene;
    this.roadMaterial = roadMaterial;
    this.currentMode = 'CLEAR';
    this.surfaceFriction = 1.0;

    this.lightningTimer = 0;
    this.isLightningActive = false;
    this.lightningFlashLight = new THREE.DirectionalLight(0xdbeafe, 0);
    this.lightningFlashLight.position.set(0, 100, 0);
    this.scene.add(this.lightningFlashLight);
  }

  setRoadMaterial(roadMaterial) {
    this.roadMaterial = roadMaterial;
  }

  setWeather(mode) {
    this.currentMode = mode;

    if (!this.scene.fog) {
      this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0015);
    }

    switch (mode) {
      case 'CLEAR':
        this.surfaceFriction = 1.0;
        this.scene.fog.density = 0.0012;
        if (this.roadMaterial) {
          this.roadMaterial.roughness = 0.85;
          this.roadMaterial.metalness = 0.12;
        }
        break;

      case 'RAIN':
        this.surfaceFriction = 0.74; // Slick wet asphalt
        this.scene.fog.density = 0.0028;
        if (this.roadMaterial) {
          this.roadMaterial.roughness = 0.22; // Wet reflective tarmac
          this.roadMaterial.metalness = 0.65;
        }
        break;

      case 'STORM':
        this.surfaceFriction = 0.68; // Very slick
        this.scene.fog.density = 0.0040;
        if (this.roadMaterial) {
          this.roadMaterial.roughness = 0.18;
          this.roadMaterial.metalness = 0.75;
        }
        break;

      case 'FOG':
        this.surfaceFriction = 0.90;
        this.scene.fog.density = 0.0090; // Dense atmospheric mist
        if (this.roadMaterial) {
          this.roadMaterial.roughness = 0.70;
          this.roadMaterial.metalness = 0.25;
        }
        break;

      default:
        this.surfaceFriction = 1.0;
        this.scene.fog.density = 0.0015;
    }
  }

  update(dt) {
    if (this.currentMode === 'STORM') {
      this.lightningTimer += dt;
      if (this.lightningTimer > 4.5 + Math.random() * 5.0) {
        // Trigger lightning flash
        this.isLightningActive = true;
        this.lightningFlashLight.intensity = 4.5;
        this.lightningTimer = 0;

        setTimeout(() => {
          this.lightningFlashLight.intensity = 0;
          setTimeout(() => {
            // Secondary double flash
            this.lightningFlashLight.intensity = 3.0;
            setTimeout(() => {
              this.lightningFlashLight.intensity = 0;
              this.isLightningActive = false;
            }, 60);
          }, 80);
        }, 90);
      }
    } else {
      this.lightningFlashLight.intensity = 0;
    }
  }
}
