import * as THREE from 'three';

export class TimeOfDayManager {
  constructor(scene, dirLight, ambientLight) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.ambientLight = ambientLight;
    this.currentTime = 'DAY';
  }

  setTimeOfDay(timeMode) {
    this.currentTime = timeMode;

    switch (timeMode) {
      case 'MORNING':
        this.scene.background = new THREE.Color(0xfde68a);
        if (this.scene.fog) this.scene.fog.color.setHex(0xfde68a);
        this.ambientLight.color.setHex(0xfff7ed);
        this.ambientLight.intensity = 1.35;
        this.dirLight.color.setHex(0xfbbf24);
        this.dirLight.intensity = 2.2;
        this.dirLight.position.set(120, 80, -80);
        break;

      case 'DAY':
        this.scene.background = new THREE.Color(0x38bdf8);
        if (this.scene.fog) this.scene.fog.color.setHex(0x38bdf8);
        this.ambientLight.color.setHex(0xf8fafc);
        this.ambientLight.intensity = 1.5;
        this.dirLight.color.setHex(0xffffff);
        this.dirLight.intensity = 2.4;
        this.dirLight.position.set(80, 160, 60);
        break;

      case 'EVENING':
        this.scene.background = new THREE.Color(0xe11d48);
        if (this.scene.fog) this.scene.fog.color.setHex(0xbe123c);
        this.ambientLight.color.setHex(0xfed7aa);
        this.ambientLight.intensity = 1.3;
        this.dirLight.color.setHex(0xf97316);
        this.dirLight.intensity = 2.0;
        this.dirLight.position.set(-140, 50, -100);
        break;

      case 'NIGHT':
        // Vibrant neon night sky with rich ambient moonlight
        this.scene.background = new THREE.Color(0x0f172a);
        if (this.scene.fog) this.scene.fog.color.setHex(0x0f172a);
        this.ambientLight.color.setHex(0x64748b);
        this.ambientLight.intensity = 1.15;
        this.dirLight.color.setHex(0x93c5fd);
        this.dirLight.intensity = 1.6;
        this.dirLight.position.set(60, 100, -40);
        break;

      default:
        break;
    }
  }

  isNightOrDark() {
    return this.currentTime === 'NIGHT' || this.currentTime === 'EVENING';
  }
}
