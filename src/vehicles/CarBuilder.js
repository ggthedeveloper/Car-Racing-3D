import * as THREE from 'three';

export class CarBuilder {
  /**
   * Builds a detailed procedural 3D racing car model
   */
  static buildCarMesh(carDef, paintColor = null, finishType = 'metallic', spoilerType = 'gt_wing', rimStyle = 'spoke5', isPlayer = false) {
    const root = new THREE.Group();
    root.name = `Car_${carDef.id}`;

    const vis = carDef.visuals;
    const carLength = vis.length || 4.5;
    const carWidth = vis.width || 1.9;
    const carHeight = vis.height || 1.2;
    const wheelRadius = vis.wheelRadius || 0.35;
    const wheelWidth = vis.wheelWidth || 0.28;

    const primaryColor = paintColor || vis.defaultColor || '#e62429';
    const secondaryColor = vis.defaultSecondary || '#111111';

    // Finish attributes
    let roughness = 0.25;
    let metalness = 0.85;
    let clearcoat = 0.8;
    if (finishType === 'gloss') {
      roughness = 0.15; metalness = 0.2; clearcoat = 0.9;
    } else if (finishType === 'matte') {
      roughness = 0.75; metalness = 0.1; clearcoat = 0.05;
    } else if (finishType === 'pearl') {
      roughness = 0.20; metalness = 0.6; clearcoat = 1.0;
    }

    // --- MATERIALS ---
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(primaryColor),
      metalness,
      roughness,
      clearcoat,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.5,
      metalness: 0.7
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      roughness: 0.6,
      metalness: 0.3
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050a14,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1
    });

    const headlightOffMat = new THREE.MeshStandardMaterial({
      color: 0xddffff,
      emissive: 0x99ddff,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0xff1122,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });

    const reverseLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.0,
      roughness: 0.2
    });

    // --- BODY GROUP (Pitches and rolls on suspension) ---
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'CarBodyGroup';
    bodyGroup.position.y = wheelRadius * 0.85; // ride height
    root.add(bodyGroup);

    // 1. Lower Chassis & Floor
    const floorGeo = new THREE.BoxGeometry(carWidth * 0.92, 0.12, carLength * 0.94);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMaterial);
    floorMesh.position.y = 0.06;
    floorMesh.castShadow = true;
    bodyGroup.add(floorMesh);

    // 2. Main Center Body Shell
    const mainBodyGeo = new THREE.BoxGeometry(carWidth, carHeight * 0.45, carLength * 0.95);
    const mainBodyMesh = new THREE.Mesh(mainBodyGeo, paintMaterial);
    mainBodyMesh.position.y = carHeight * 0.25;
    mainBodyMesh.castShadow = true;
    mainBodyMesh.receiveShadow = true;
    bodyGroup.add(mainBodyMesh);

    // 3. Front Hood (sloped forward)
    const hoodGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.08, carLength * 0.32);
    const hoodMesh = new THREE.Mesh(hoodGeo, paintMaterial);
    hoodMesh.position.set(0, carHeight * 0.42, carLength * 0.25);
    hoodMesh.rotation.x = -0.06; // slight aerodynamic slant
    hoodMesh.castShadow = true;
    bodyGroup.add(hoodMesh);

    // Hood scoop / vents on performance cars
    if (carDef.id === 'torque-x' || carDef.id === 'titan-v12') {
      const scoopGeo = new THREE.BoxGeometry(carWidth * 0.35, 0.08, carLength * 0.15);
      const scoopMesh = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoopMesh.position.set(0, carHeight * 0.47, carLength * 0.26);
      bodyGroup.add(scoopMesh);
    }

    // 4. Cabin & Roof (Greenhouse)
    const cabinWidth = carWidth * 0.78;
    const cabinHeight = carHeight * 0.52;
    const cabinLength = carLength * 0.45;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabinMesh = new THREE.Mesh(cabinGeo, paintMaterial);
    cabinMesh.position.set(0, carHeight * 0.65, -carLength * 0.04);
    cabinMesh.castShadow = true;
    bodyGroup.add(cabinMesh);

    // Windshield (front)
    const windshieldGeo = new THREE.PlaneGeometry(cabinWidth * 0.92, cabinHeight * 0.9);
    const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshieldMesh.position.set(0, carHeight * 0.64, cabinLength * 0.5 - carLength * 0.038);
    windshieldMesh.rotation.x = 0.58; // aerodynamic rake
    bodyGroup.add(windshieldMesh);

    // Rear Windshield
    const rearGlassGeo = new THREE.PlaneGeometry(cabinWidth * 0.9, cabinHeight * 0.85);
    const rearGlassMesh = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlassMesh.position.set(0, carHeight * 0.62, -cabinLength * 0.5 - carLength * 0.042);
    rearGlassMesh.rotation.x = -0.65;
    rearGlassMesh.rotation.y = Math.PI;
    bodyGroup.add(rearGlassMesh);

    // Side Windows
    const sideGlassGeo = new THREE.PlaneGeometry(cabinLength * 0.85, cabinHeight * 0.65);
    const leftGlass = new THREE.Mesh(sideGlassGeo, glassMaterial);
    leftGlass.position.set(-cabinWidth * 0.505, carHeight * 0.65, -carLength * 0.04);
    leftGlass.rotation.y = -Math.PI / 2;
    bodyGroup.add(leftGlass);

    const rightGlass = new THREE.Mesh(sideGlassGeo, glassMaterial);
    rightGlass.position.set(cabinWidth * 0.505, carHeight * 0.65, -carLength * 0.04);
    rightGlass.rotation.y = Math.PI / 2;
    bodyGroup.add(rightGlass);

    // Interior Cockpit Dash & Steering Wheel approximation
    const dashGeo = new THREE.BoxGeometry(cabinWidth * 0.85, 0.15, 0.3);
    const dashMesh = new THREE.Mesh(dashGeo, trimMaterial);
    dashMesh.position.set(0, carHeight * 0.48, carLength * 0.08);
    bodyGroup.add(dashMesh);

    const steeringWheelGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 16);
    const steeringWheelMesh = new THREE.Mesh(steeringWheelGeo, trimMaterial);
    steeringWheelMesh.position.set(-0.35, carHeight * 0.55, carLength * 0.02);
    steeringWheelMesh.rotation.x = 0.4;
    bodyGroup.add(steeringWheelMesh);

    // 5. Front Bumper, Splitter & Grille
    const frontBumperGeo = new THREE.BoxGeometry(carWidth * 0.98, carHeight * 0.28, carLength * 0.12);
    const frontBumperMesh = new THREE.Mesh(frontBumperGeo, trimMaterial);
    frontBumperMesh.position.set(0, carHeight * 0.15, carLength * 0.48);
    frontBumperMesh.castShadow = true;
    bodyGroup.add(frontBumperMesh);

    const frontSplitterGeo = new THREE.BoxGeometry(carWidth * 1.02, 0.04, carLength * 0.18);
    const frontSplitterMesh = new THREE.Mesh(frontSplitterGeo, carbonMaterial);
    frontSplitterMesh.position.set(0, 0.03, carLength * 0.48);
    bodyGroup.add(frontSplitterMesh);

    // Grille
    const grilleGeo = new THREE.PlaneGeometry(carWidth * 0.5, carHeight * 0.18);
    const grilleMesh = new THREE.Mesh(grilleGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    grilleMesh.position.set(0, carHeight * 0.14, carLength * 0.541);
    bodyGroup.add(grilleMesh);

    // 6. Rear Bumper & Diffuser
    const rearBumperGeo = new THREE.BoxGeometry(carWidth * 0.96, carHeight * 0.32, carLength * 0.12);
    const rearBumperMesh = new THREE.Mesh(rearBumperGeo, trimMaterial);
    rearBumperMesh.position.set(0, carHeight * 0.18, -carLength * 0.48);
    rearBumperMesh.castShadow = true;
    bodyGroup.add(rearBumperMesh);

    const diffuserGeo = new THREE.BoxGeometry(carWidth * 0.85, 0.12, carLength * 0.2);
    const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuserMesh.position.set(0, 0.06, -carLength * 0.48);
    diffuserMesh.rotation.x = -0.15;
    bodyGroup.add(diffuserMesh);

    // 7. Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.08, 0.12);
    const leftMirror = new THREE.Mesh(mirrorGeo, trimMaterial);
    leftMirror.position.set(-carWidth * 0.52, carHeight * 0.52, carLength * 0.1);
    bodyGroup.add(leftMirror);

    const rightMirror = new THREE.Mesh(mirrorGeo, trimMaterial);
    rightMirror.position.set(carWidth * 0.52, carHeight * 0.52, carLength * 0.1);
    bodyGroup.add(rightMirror);

    // 8. Headlights (Left & Right)
    const headLightGeo = new THREE.BoxGeometry(carWidth * 0.22, carHeight * 0.1, 0.06);
    const leftHeadlight = new THREE.Mesh(headLightGeo, headlightOffMat);
    leftHeadlight.position.set(-carWidth * 0.34, carHeight * 0.28, carLength * 0.495);
    bodyGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headLightGeo, headlightOffMat);
    rightHeadlight.position.set(carWidth * 0.34, carHeight * 0.28, carLength * 0.495);
    bodyGroup.add(rightHeadlight);

    // Headlight Spotlights for Night driving (only created for player car to preserve high framerate)
    let headLightSpotLeft = null;
    let headLightSpotRight = null;
    if (isPlayer) {
      headLightSpotLeft = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 5, 0.3, 1.0);
      headLightSpotLeft.position.set(-carWidth * 0.34, carHeight * 0.28, carLength * 0.5);
      headLightSpotLeft.target.position.set(-carWidth * 0.34, 0, carLength * 0.5 + 20);
      bodyGroup.add(headLightSpotLeft);
      bodyGroup.add(headLightSpotLeft.target);

      headLightSpotRight = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 5, 0.3, 1.0);
      headLightSpotRight.position.set(carWidth * 0.34, carHeight * 0.28, carLength * 0.5);
      headLightSpotRight.target.position.set(carWidth * 0.34, 0, carLength * 0.5 + 20);
      bodyGroup.add(headLightSpotRight);
      bodyGroup.add(headLightSpotRight.target);
    }

    // 9. Taillights
    const tailLightGeo = new THREE.BoxGeometry(carWidth * 0.24, carHeight * 0.08, 0.05);
    const leftTaillight = new THREE.Mesh(tailLightGeo, taillightMat);
    leftTaillight.position.set(-carWidth * 0.33, carHeight * 0.32, -carLength * 0.495);
    bodyGroup.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(tailLightGeo, taillightMat);
    rightTaillight.position.set(carWidth * 0.33, carHeight * 0.32, -carLength * 0.495);
    bodyGroup.add(rightTaillight);

    // Lightbar strip connecting taillights
    const lightBarGeo = new THREE.BoxGeometry(carWidth * 0.4, carHeight * 0.03, 0.05);
    const lightBar = new THREE.Mesh(lightBarGeo, taillightMat);
    lightBar.position.set(0, carHeight * 0.32, -carLength * 0.495);
    bodyGroup.add(lightBar);

    // 10. Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.15, 16);
    exhaustGeo.rotateX(Math.PI / 2);
    const leftExhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
    leftExhaust.position.set(-0.35, 0.12, -carLength * 0.495);
    bodyGroup.add(leftExhaust);

    const rightExhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
    rightExhaust.position.set(0.35, 0.12, -carLength * 0.495);
    bodyGroup.add(rightExhaust);

    // Flame attachment points
    const leftFlamePoint = new THREE.Object3D();
    leftFlamePoint.position.set(-0.35, 0.12, -carLength * 0.55);
    bodyGroup.add(leftFlamePoint);

    const rightFlamePoint = new THREE.Object3D();
    rightFlamePoint.position.set(0.35, 0.12, -carLength * 0.55);
    bodyGroup.add(rightFlamePoint);

    // 11. Spoilers (Parametric)
    const spoilerGroup = new THREE.Group();
    spoilerGroup.name = 'SpoilerGroup';
    bodyGroup.add(spoilerGroup);
    CarBuilder.buildSpoiler(spoilerGroup, spoilerType, carWidth, carHeight, carLength, carbonMaterial);

    // --- 4 INDEPENDENT WHEEL ASSEMBLIES ---
    const wheelbaseHalf = carLength * 0.31;
    const trackWidthHalf = carWidth * 0.47;

    const wheelPositions = [
      { id: 'FL', x: -trackWidthHalf, z: wheelbaseHalf, isFront: true },
      { id: 'FR', x: trackWidthHalf, z: wheelbaseHalf, isFront: true },
      { id: 'RL', x: -trackWidthHalf, z: -wheelbaseHalf, isFront: false },
      { id: 'RR', x: trackWidthHalf, z: -wheelbaseHalf, isFront: false }
    ];

    const wheelNodes = [];

    wheelPositions.forEach((wp, index) => {
      // Steer pivot for front wheels
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wheelRadius, wp.z);
      steerPivot.name = `SteerPivot_${wp.id}`;
      root.add(steerPivot);

      // Wheel spin group (rotates around X axis)
      const spinGroup = new THREE.Group();
      spinGroup.name = `WheelSpin_${wp.id}`;
      steerPivot.add(spinGroup);

      // Wheel Mesh
      const wheelAssembly = CarBuilder.buildSingleWheel(wheelRadius, wheelWidth, rimStyle, wp.x < 0);
      spinGroup.add(wheelAssembly);

      // Brake Disc & Caliper (placed on steerPivot so caliper doesn't spin with the wheel!)
      const brakeAssembly = CarBuilder.buildBrakeAssembly(wheelRadius * 0.75, wp.x < 0);
      steerPivot.add(brakeAssembly);

      wheelNodes.push({
        id: wp.id,
        isFront: wp.isFront,
        steerPivot,
        spinGroup,
        wheelRadius
      });
    });

    return {
      root,
      bodyGroup,
      paintMaterial,
      carbonMaterial,
      headlightOffMat,
      taillightMat,
      reverseLightMat,
      headLightSpotLeft,
      headLightSpotRight,
      wheelNodes,
      leftFlamePoint,
      rightFlamePoint,
      spoilerGroup
    };
  }

  static buildSingleWheel(radius, width, rimStyle = 'spoke5', isLeft = true) {
    const wheelGroup = new THREE.Group();

    // Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.1
    });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Rim Outer Barrel
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      roughness: 0.25,
      metalness: 0.9
    });
    const rimGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 20);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    // Rim Spokes (Facing outward)
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.18,
      metalness: 0.95
    });
    const outwardX = isLeft ? -width * 0.48 : width * 0.48;

    const spokeCount = rimStyle === 'spoke10' ? 10 : 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.02, radius * 0.65, 0.035);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.x = outwardX;
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // Center Hub & Lug Nuts
    const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.05, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, spokeMat);
    hub.position.x = outwardX;
    wheelGroup.add(hub);

    return wheelGroup;
  }

  static buildBrakeAssembly(discRadius, isLeft = true) {
    const brakeGroup = new THREE.Group();
    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, 0.025, 20);
    discGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.2,
      metalness: 0.95
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    brakeGroup.add(discMesh);

    // Brembo Red Caliper
    const caliperGeo = new THREE.BoxGeometry(0.06, discRadius * 0.6, 0.09);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.3,
      metalness: 0.7
    });
    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
    caliperMesh.position.set(0, discRadius * 0.7, 0);
    brakeGroup.add(caliperMesh);

    return brakeGroup;
  }

  static buildSpoiler(parentGroup, type, carWidth, carHeight, carLength, carbonMat) {
    while (parentGroup.children.length > 0) {
      parentGroup.remove(parentGroup.children[0]);
    }

    if (type === 'none') return;

    if (type === 'ducktail') {
      const duckGeo = new THREE.BoxGeometry(carWidth * 0.85, 0.08, 0.12);
      const duckMesh = new THREE.Mesh(duckGeo, carbonMat);
      duckMesh.position.set(0, carHeight * 0.44, -carLength * 0.46);
      duckMesh.rotation.x = 0.25;
      duckMesh.castShadow = true;
      parentGroup.add(duckMesh);
      return;
    }

    // Wing Stanchions (Uprights)
    const wingHeight = type === 'carbon_super_wing' ? 0.38 : 0.26;
    const wingY = carHeight * 0.42 + wingHeight;
    const wingZ = -carLength * 0.44;

    const uprightGeo = new THREE.BoxGeometry(0.04, wingHeight, 0.1);
    const leftUpright = new THREE.Mesh(uprightGeo, carbonMat);
    leftUpright.position.set(-carWidth * 0.3, carHeight * 0.42 + wingHeight * 0.5, wingZ);
    leftUpright.castShadow = true;
    parentGroup.add(leftUpright);

    const rightUpright = new THREE.Mesh(uprightGeo, carbonMat);
    rightUpright.position.set(carWidth * 0.3, carHeight * 0.42 + wingHeight * 0.5, wingZ);
    rightUpright.castShadow = true;
    parentGroup.add(rightUpright);

    // Wing Blade
    const wingWidth = type === 'carbon_super_wing' ? carWidth * 1.05 : carWidth * 0.9;
    const wingChord = 0.25;
    const wingGeo = new THREE.BoxGeometry(wingWidth, 0.035, wingChord);
    const wingMesh = new THREE.Mesh(wingGeo, carbonMat);
    wingMesh.position.set(0, wingY, wingZ);
    wingMesh.rotation.x = -0.12; // angle of attack
    wingMesh.castShadow = true;
    parentGroup.add(wingMesh);

    // Endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.16, wingChord * 1.2);
    const leftEnd = new THREE.Mesh(endplateGeo, carbonMat);
    leftEnd.position.set(-wingWidth * 0.5, wingY, wingZ);
    parentGroup.add(leftEnd);

    const rightEnd = new THREE.Mesh(endplateGeo, carbonMat);
    rightEnd.position.set(wingWidth * 0.5, wingY, wingZ);
    parentGroup.add(rightEnd);
  }
}
