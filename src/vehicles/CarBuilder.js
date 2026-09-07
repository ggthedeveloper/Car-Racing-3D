import * as THREE from 'three';

export class CarBuilder {
  /**
   * Builds an industry-level, highly detailed procedural 3D racing car model
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
    let roughness = 0.20;
    let metalness = 0.85;
    let clearcoat = 1.0;
    let clearcoatRoughness = 0.05;
    if (finishType === 'gloss') {
      roughness = 0.12; metalness = 0.25; clearcoat = 1.0; clearcoatRoughness = 0.03;
    } else if (finishType === 'matte') {
      roughness = 0.72; metalness = 0.15; clearcoat = 0.05; clearcoatRoughness = 0.4;
    } else if (finishType === 'pearl') {
      roughness = 0.16; metalness = 0.65; clearcoat = 1.0; clearcoatRoughness = 0.05;
    }

    // --- AUTOMOTIVE GRADE PBR MATERIALS ---
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(primaryColor),
      metalness,
      roughness,
      clearcoat,
      clearcoatRoughness,
      reflectivity: 1.0,
      ior: 1.5
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x161619,
      roughness: 0.42,
      metalness: 0.65
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      roughness: 0.55,
      metalness: 0.35
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1018,
      metalness: 0.1,
      roughness: 0.03,
      transmission: 0.75,
      transparent: true,
      opacity: 0.9,
      ior: 1.52
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.98,
      roughness: 0.08
    });

    const headlightOffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x99ddff,
      emissiveIntensity: 1.2,
      roughness: 0.05
    });

    const drlGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0xff1122,
      emissiveIntensity: 0.8,
      roughness: 0.15
    });

    const reverseLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.0,
      roughness: 0.2
    });

    const interiorDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c20,
      roughness: 0.85,
      metalness: 0.1
    });

    const seatAccentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryColor).multiplyScalar(0.7),
      roughness: 0.7,
      metalness: 0.2
    });

    // --- BODY GROUP (Suspension Pitch & Roll dynamic parent) ---
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'CarBodyGroup';
    bodyGroup.position.y = wheelRadius * 0.85; // ride height
    root.add(bodyGroup);

    // 1. Lower Aerodynamic Flat Underbody / Carbon Skidplate
    const floorGeo = new THREE.BoxGeometry(carWidth * 0.94, 0.08, carLength * 0.96);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMaterial);
    floorMesh.position.y = 0.05;
    floorMesh.castShadow = true;
    bodyGroup.add(floorMesh);

    // 2. Sculpted Lower Body Base
    const lowerBodyGeo = new THREE.BoxGeometry(carWidth * 0.96, carHeight * 0.35, carLength * 0.94);
    const lowerBodyMesh = new THREE.Mesh(lowerBodyGeo, paintMaterial);
    lowerBodyMesh.position.y = carHeight * 0.20;
    lowerBodyMesh.castShadow = true;
    lowerBodyMesh.receiveShadow = true;
    bodyGroup.add(lowerBodyMesh);

    // 3. Widebody Flared Wheel Arches (Fenders)
    // Front and rear fender flares give the car an aggressive, muscular supercar stance
    const frontFenderGeo = new THREE.BoxGeometry(carWidth * 1.04, carHeight * 0.28, wheelWidth * 2.2);
    const frontFenderMesh = new THREE.Mesh(frontFenderGeo, paintMaterial);
    frontFenderMesh.position.set(0, carHeight * 0.22, carLength * 0.31);
    frontFenderMesh.castShadow = true;
    bodyGroup.add(frontFenderMesh);

    const rearFenderGeo = new THREE.BoxGeometry(carWidth * 1.06, carHeight * 0.30, wheelWidth * 2.3);
    const rearFenderMesh = new THREE.Mesh(rearFenderGeo, paintMaterial);
    rearFenderMesh.position.set(0, carHeight * 0.24, -carLength * 0.31);
    rearFenderMesh.castShadow = true;
    bodyGroup.add(rearFenderMesh);

    // Aerodynamic Side Skirts with Carbon Fiber Ground-Effect Channels
    [-1, 1].forEach((side) => {
      const skirtGeo = new THREE.BoxGeometry(0.08, 0.06, carLength * 0.46);
      const skirtMesh = new THREE.Mesh(skirtGeo, carbonMaterial);
      skirtMesh.position.set(side * (carWidth * 0.49), 0.04, 0);
      bodyGroup.add(skirtMesh);

      // Side skirt winglet ahead of rear wheels
      const wingletGeo = new THREE.BoxGeometry(0.03, 0.12, 0.14);
      const wingletMesh = new THREE.Mesh(wingletGeo, carbonMaterial);
      wingletMesh.position.set(side * (carWidth * 0.52), 0.08, -carLength * 0.20);
      bodyGroup.add(wingletMesh);
    });

    // 4. Front Nose & Sculpted Hood with Air Vents
    const hoodGeo = new THREE.BoxGeometry(carWidth * 0.86, 0.07, carLength * 0.32);
    const hoodMesh = new THREE.Mesh(hoodGeo, paintMaterial);
    hoodMesh.position.set(0, carHeight * 0.38, carLength * 0.25);
    hoodMesh.rotation.x = -0.07; // aerodynamic slant
    hoodMesh.castShadow = true;
    bodyGroup.add(hoodMesh);

    // Dual Recessed Hood Air Extractors
    [-1, 1].forEach((side) => {
      const ventGeo = new THREE.BoxGeometry(carWidth * 0.14, 0.02, carLength * 0.12);
      const ventMesh = new THREE.Mesh(ventGeo, carbonMaterial);
      ventMesh.position.set(side * (carWidth * 0.22), carHeight * 0.40, carLength * 0.24);
      bodyGroup.add(ventMesh);
    });

    // Performance Hood Scoop on Muscle/Hypercars
    if (carDef.id === 'torque-x' || carDef.id === 'titan-v12') {
      const scoopGeo = new THREE.BoxGeometry(carWidth * 0.32, 0.08, carLength * 0.16);
      const scoopMesh = new THREE.Mesh(scoopGeo, carbonMaterial);
      scoopMesh.position.set(0, carHeight * 0.44, carLength * 0.26);
      bodyGroup.add(scoopMesh);
    }

    // 5. Greenhouse (Cabin, Sloped Pillars & Roof)
    const cabinWidth = carWidth * 0.76;
    const cabinHeight = carHeight * 0.50;
    const cabinLength = carLength * 0.46;
    const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.92, 0.06, cabinLength * 0.65);
    const roofMesh = new THREE.Mesh(roofGeo, carbonMaterial);
    roofMesh.position.set(0, carHeight * 0.88, -carLength * 0.06);
    roofMesh.castShadow = true;
    bodyGroup.add(roofMesh);

    // Windshield (aerodynamic rake)
    const windshieldGeo = new THREE.PlaneGeometry(cabinWidth * 0.94, cabinHeight * 0.96);
    const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshieldMesh.position.set(0, carHeight * 0.66, cabinLength * 0.48 - carLength * 0.05);
    windshieldMesh.rotation.x = 0.62;
    bodyGroup.add(windshieldMesh);

    // Rear Windshield (fastback slope)
    const rearGlassGeo = new THREE.PlaneGeometry(cabinWidth * 0.92, cabinHeight * 0.90);
    const rearGlassMesh = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlassMesh.position.set(0, carHeight * 0.64, -cabinLength * 0.48 - carLength * 0.05);
    rearGlassMesh.rotation.x = -0.68;
    rearGlassMesh.rotation.y = Math.PI;
    bodyGroup.add(rearGlassMesh);

    // Side Windows
    [-1, 1].forEach((side) => {
      const sideGlassGeo = new THREE.PlaneGeometry(cabinLength * 0.82, cabinHeight * 0.62);
      const sideGlass = new THREE.Mesh(sideGlassGeo, glassMaterial);
      sideGlass.position.set(side * (cabinWidth * 0.49), carHeight * 0.65, -carLength * 0.05);
      sideGlass.rotation.y = (side > 0) ? Math.PI / 2 : -Math.PI / 2;
      bodyGroup.add(sideGlass);
    });

    // 6. Cockpit Interior Silhouette (Visible through tinted glass)
    // Dashboard & Instrument Binnacle
    const dashGeo = new THREE.BoxGeometry(cabinWidth * 0.88, 0.16, 0.32);
    const dashMesh = new THREE.Mesh(dashGeo, interiorDarkMat);
    dashMesh.position.set(0, carHeight * 0.47, carLength * 0.09);
    bodyGroup.add(dashMesh);

    // Sport Steering Wheel
    const steeringWheelGeo = new THREE.TorusGeometry(0.12, 0.022, 12, 24);
    const steeringWheelMesh = new THREE.Mesh(steeringWheelGeo, trimMaterial);
    steeringWheelMesh.position.set(-0.32, carHeight * 0.54, carLength * 0.03);
    steeringWheelMesh.rotation.x = 0.42;
    bodyGroup.add(steeringWheelMesh);

    // Dual Racing Bucket Seats with Headrests
    [-0.32, 0.32].forEach((seatX) => {
      const seatGroup = new THREE.Group();
      // Seat cushion
      const seatBaseGeo = new THREE.BoxGeometry(0.38, 0.12, 0.42);
      const seatBase = new THREE.Mesh(seatBaseGeo, interiorDarkMat);
      seatGroup.add(seatBase);

      // Seat backrest (angled)
      const seatBackGeo = new THREE.BoxGeometry(0.36, 0.45, 0.10);
      const seatBack = new THREE.Mesh(seatBackGeo, seatAccentMat);
      seatBack.position.set(0, 0.26, -0.16);
      seatBack.rotation.x = -0.16;
      seatGroup.add(seatBack);

      // Headrest
      const headrestGeo = new THREE.BoxGeometry(0.24, 0.14, 0.08);
      const headrest = new THREE.Mesh(headrestGeo, interiorDarkMat);
      headrest.position.set(0, 0.52, -0.22);
      seatGroup.add(headrest);

      seatGroup.position.set(seatX, carHeight * 0.32, -carLength * 0.06);
      bodyGroup.add(seatGroup);
    });

    // Roll Cage Diagonal Crossbar (GT3 / Motorsport look)
    const rollBarGeo = new THREE.CylinderGeometry(0.02, 0.02, cabinWidth * 0.92, 8);
    rollBarGeo.rotateZ(0.55);
    const rollBarMesh = new THREE.Mesh(rollBarGeo, carbonMaterial);
    rollBarMesh.position.set(0, carHeight * 0.65, -carLength * 0.20);
    bodyGroup.add(rollBarMesh);

    // 7. Front Bumper, Splitter with Canards & 3D Grille
    const frontBumperGeo = new THREE.BoxGeometry(carWidth * 0.98, carHeight * 0.26, carLength * 0.12);
    const frontBumperMesh = new THREE.Mesh(frontBumperGeo, trimMaterial);
    frontBumperMesh.position.set(0, carHeight * 0.15, carLength * 0.48);
    frontBumperMesh.castShadow = true;
    bodyGroup.add(frontBumperMesh);

    // Carbon Fiber Track Splitter with Outer Winglets
    const frontSplitterGeo = new THREE.BoxGeometry(carWidth * 1.04, 0.035, carLength * 0.18);
    const frontSplitterMesh = new THREE.Mesh(frontSplitterGeo, carbonMaterial);
    frontSplitterMesh.position.set(0, 0.025, carLength * 0.50);
    bodyGroup.add(frontSplitterMesh);

    [-1, 1].forEach((side) => {
      // Splitter vertical endplate
      const canardGeo = new THREE.BoxGeometry(0.025, 0.12, 0.14);
      const canardMesh = new THREE.Mesh(canardGeo, carbonMaterial);
      canardMesh.position.set(side * (carWidth * 0.52), 0.08, carLength * 0.50);
      bodyGroup.add(canardMesh);
    });

    // Central Hexagonal Radiator Grille
    const grilleGeo = new THREE.PlaneGeometry(carWidth * 0.54, carHeight * 0.17);
    const grilleMesh = new THREE.Mesh(grilleGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    grilleMesh.position.set(0, carHeight * 0.14, carLength * 0.542);
    bodyGroup.add(grilleMesh);

    // Dual Brake Cooling Inlets
    [-1, 1].forEach((side) => {
      const inletGeo = new THREE.PlaneGeometry(carWidth * 0.16, carHeight * 0.12);
      const inletMesh = new THREE.Mesh(inletGeo, new THREE.MeshBasicMaterial({ color: 0x080808 }));
      inletMesh.position.set(side * (carWidth * 0.38), carHeight * 0.12, carLength * 0.541);
      bodyGroup.add(inletMesh);
    });

    // 8. Dual Projector Crystal LED Headlights with DRL Eyebrows
    [-1, 1].forEach((side) => {
      const headGroup = new THREE.Group();
      headGroup.position.set(side * (carWidth * 0.35), carHeight * 0.28, carLength * 0.495);

      // Blackened headlight housing
      const housingGeo = new THREE.BoxGeometry(carWidth * 0.22, carHeight * 0.10, 0.05);
      const housingMesh = new THREE.Mesh(housingGeo, trimMaterial);
      headGroup.add(housingMesh);

      // Twin circular projector lenses inside
      [-0.05, 0.05].forEach((lensX) => {
        const lensGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
        lensGeo.rotateX(Math.PI / 2);
        const lensMesh = new THREE.Mesh(lensGeo, headlightOffMat);
        lensMesh.position.set(lensX, 0, 0.02);
        headGroup.add(lensMesh);
      });

      // L-shaped Daytime Running Light (DRL) accent
      const drlGeo = new THREE.BoxGeometry(carWidth * 0.20, 0.015, 0.03);
      const drlMesh = new THREE.Mesh(drlGeo, drlGlowMat);
      drlMesh.position.set(0, carHeight * 0.04, 0.025);
      headGroup.add(drlMesh);

      bodyGroup.add(headGroup);
    });

    // Headlight Spotlights for Night driving (only created for player car to preserve high framerate)
    let headLightSpotLeft = null;
    let headLightSpotRight = null;
    if (isPlayer) {
      headLightSpotLeft = new THREE.SpotLight(0xffffff, 0, 55, Math.PI / 5, 0.3, 1.0);
      headLightSpotLeft.position.set(-carWidth * 0.35, carHeight * 0.28, carLength * 0.5);
      headLightSpotLeft.target.position.set(-carWidth * 0.35, 0, carLength * 0.5 + 25);
      bodyGroup.add(headLightSpotLeft);
      bodyGroup.add(headLightSpotLeft.target);

      headLightSpotRight = new THREE.SpotLight(0xffffff, 0, 55, Math.PI / 5, 0.3, 1.0);
      headLightSpotRight.position.set(carWidth * 0.35, carHeight * 0.28, carLength * 0.5);
      headLightSpotRight.target.position.set(carWidth * 0.35, 0, carLength * 0.5 + 25);
      bodyGroup.add(headLightSpotRight);
      bodyGroup.add(headLightSpotRight.target);
    }

    // 9. Modern Full-Width Continuous 3D LED Rear Lightbar
    // Modern Porsche / Audi / Bugatti style sleek continuous LED lightbar
    const rearDeckY = carHeight * 0.34;
    const rearDeckZ = -carLength * 0.495;

    const fullLightBarGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.045, 0.04);
    const fullLightBar = new THREE.Mesh(fullLightBarGeo, taillightMat);
    fullLightBar.position.set(0, rearDeckY, rearDeckZ);
    bodyGroup.add(fullLightBar);

    // Left and right outer taillight clusters
    const tailClusterGeo = new THREE.BoxGeometry(carWidth * 0.24, carHeight * 0.07, 0.045);
    const leftTaillight = new THREE.Mesh(tailClusterGeo, taillightMat);
    leftTaillight.position.set(-carWidth * 0.34, rearDeckY, rearDeckZ);
    bodyGroup.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(tailClusterGeo, taillightMat);
    rightTaillight.position.set(carWidth * 0.34, rearDeckY, rearDeckZ);
    bodyGroup.add(rightTaillight);

    // Center Reverse Light
    const revGeo = new THREE.BoxGeometry(carWidth * 0.18, 0.025, 0.046);
    const reverseLight = new THREE.Mesh(revGeo, reverseLightMat);
    reverseLight.position.set(0, rearDeckY - 0.05, rearDeckZ);
    bodyGroup.add(reverseLight);

    // 10. Rear Bumper & Multi-Fin Racing Diffuser
    const rearBumperGeo = new THREE.BoxGeometry(carWidth * 0.98, carHeight * 0.30, carLength * 0.12);
    const rearBumperMesh = new THREE.Mesh(rearBumperGeo, trimMaterial);
    rearBumperMesh.position.set(0, carHeight * 0.18, -carLength * 0.48);
    rearBumperMesh.castShadow = true;
    bodyGroup.add(rearBumperMesh);

    // Multi-Fin Underbody Diffuser
    const diffuserBaseGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.08, carLength * 0.22);
    const diffuserBase = new THREE.Mesh(diffuserBaseGeo, carbonMaterial);
    diffuserBase.position.set(0, 0.06, -carLength * 0.49);
    diffuserBase.rotation.x = -0.14;
    bodyGroup.add(diffuserBase);

    // 4 Vertical Diffuser Airflow Fins
    [-0.32, -0.11, 0.11, 0.32].forEach((finX) => {
      const finGeo = new THREE.BoxGeometry(0.02, 0.10, carLength * 0.20);
      const fin = new THREE.Mesh(finGeo, carbonMaterial);
      fin.position.set(finX, 0.05, -carLength * 0.49);
      bodyGroup.add(fin);
    });

    // 11. Dual Tuned Titanium Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.048, 0.18, 20);
    exhaustGeo.rotateX(Math.PI / 2);
    [-0.24, 0.24].forEach((exX) => {
      const exMesh = new THREE.Mesh(exhaustGeo, chromeMaterial);
      exMesh.position.set(exX, 0.11, -carLength * 0.505);
      bodyGroup.add(exMesh);

      // Dark exhaust pipe interior depth
      const innerGeo = new THREE.CircleGeometry(0.038, 16);
      const innerMesh = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
      innerMesh.position.set(exX, 0.11, -carLength * 0.515);
      innerMesh.rotation.y = Math.PI;
      bodyGroup.add(innerMesh);
    });

    // Nitro Flame attachment points
    const leftFlamePoint = new THREE.Object3D();
    leftFlamePoint.position.set(-0.24, 0.11, -carLength * 0.56);
    bodyGroup.add(leftFlamePoint);

    const rightFlamePoint = new THREE.Object3D();
    rightFlamePoint.position.set(0.24, 0.11, -carLength * 0.56);
    bodyGroup.add(rightFlamePoint);

    // 12. Aerodynamic Side Mirrors
    [-1, 1].forEach((side) => {
      const mirrorGroup = new THREE.Group();
      // Mirror arm
      const armGeo = new THREE.BoxGeometry(0.08, 0.025, 0.03);
      const arm = new THREE.Mesh(armGeo, trimMaterial);
      mirrorGroup.add(arm);

      // Mirror housing (aerodynamic bullet shape)
      const houseGeo = new THREE.BoxGeometry(0.16, 0.09, 0.09);
      const house = new THREE.Mesh(houseGeo, paintMaterial);
      house.position.set(side * 0.08, 0.02, 0);
      mirrorGroup.add(house);

      // Reflective glass
      const refGeo = new THREE.PlaneGeometry(0.14, 0.07);
      const refMesh = new THREE.Mesh(refGeo, chromeMaterial);
      refMesh.position.set(side * 0.08, 0.02, -0.046);
      refMesh.rotation.y = Math.PI;
      mirrorGroup.add(refMesh);

      mirrorGroup.position.set(side * (carWidth * 0.50), carHeight * 0.54, carLength * 0.10);
      bodyGroup.add(mirrorGroup);
    });

    // 13. Spoilers & Wings (Parametric)
    const spoilerGroup = new THREE.Group();
    spoilerGroup.name = 'SpoilerGroup';
    bodyGroup.add(spoilerGroup);
    CarBuilder.buildSpoiler(spoilerGroup, spoilerType, carWidth, carHeight, carLength, carbonMaterial);

    // --- 4 INDEPENDENT RACING WHEEL ASSEMBLIES ---
    const wheelbaseHalf = carLength * 0.31;
    const trackWidthHalf = carWidth * 0.48;

    const wheelPositions = [
      { id: 'FL', x: -trackWidthHalf, z: wheelbaseHalf, isFront: true },
      { id: 'FR', x: trackWidthHalf, z: wheelbaseHalf, isFront: true },
      { id: 'RL', x: -trackWidthHalf, z: -wheelbaseHalf, isFront: false },
      { id: 'RR', x: trackWidthHalf, z: -wheelbaseHalf, isFront: false }
    ];

    const wheelNodes = [];

    wheelPositions.forEach((wp) => {
      // Steer pivot for front wheels
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wheelRadius, wp.z);
      steerPivot.name = `SteerPivot_${wp.id}`;
      root.add(steerPivot);

      // Wheel spin group (rotates around X axis)
      const spinGroup = new THREE.Group();
      spinGroup.name = `WheelSpin_${wp.id}`;
      steerPivot.add(spinGroup);

      // High-detail Wheel Assembly (Tire + Multi-spoke Rim)
      const wheelAssembly = CarBuilder.buildSingleWheel(wheelRadius, wheelWidth, rimStyle, wp.x < 0);
      spinGroup.add(wheelAssembly);

      // Ventilated Slotted Brake Disc & Brembo Caliper (remains on steerPivot so it turns with steering but doesn't spin with the wheel!)
      const brakeAssembly = CarBuilder.buildBrakeAssembly(wheelRadius * 0.76, wp.x < 0);
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

    // 1. Realistic Low-Profile Performance Tire with Tread Bevel
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.85,
      metalness: 0.08
    });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // 2. Concave Rim Barrel & Outer Polished Lip
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1e2024,
      roughness: 0.22,
      metalness: 0.92
    });
    const rimGeo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, width * 1.01, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    // Outer Polished Chrome Lip Ring
    const lipGeo = new THREE.TorusGeometry(radius * 0.73, 0.015, 12, 28);
    lipGeo.rotateY(Math.PI / 2);
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.98
    });
    const lipMesh = new THREE.Mesh(lipGeo, lipMat);
    lipMesh.position.x = isLeft ? -width * 0.49 : width * 0.49;
    wheelGroup.add(lipMesh);

    // 3. Multi-Spoke Alloy Rim Architecture
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.15,
      metalness: 0.96
    });
    const outwardX = isLeft ? -width * 0.48 : width * 0.48;

    const spokeCount = rimStyle === 'spoke10' ? 10 : 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      // Slanted twin-spoke or single spoke
      const spokeGeo = new THREE.BoxGeometry(0.024, radius * 0.68, 0.038);
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.x = outwardX;
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // 4. Center Hub with Machined Wheel Center Cap & 5 Lug Nuts
    const hubGeo = new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, 0.045, 16);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, rimMat);
    hub.position.x = outwardX;
    wheelGroup.add(hub);

    for (let l = 0; l < 5; l++) {
      const lugAngle = (l / 5) * Math.PI * 2;
      const lugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6);
      lugGeo.rotateZ(Math.PI / 2);
      const lug = new THREE.Mesh(lugGeo, lipMat);
      lug.position.set(
        outwardX + (isLeft ? -0.005 : 0.005),
        Math.cos(lugAngle) * (radius * 0.14),
        Math.sin(lugAngle) * (radius * 0.14)
      );
      wheelGroup.add(lug);
    }

    return wheelGroup;
  }

  static buildBrakeAssembly(discRadius, isLeft = true) {
    const brakeGroup = new THREE.Group();

    // 1. Cross-Drilled & Slotted Racing Brake Rotor
    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, 0.022, 24);
    discGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.18,
      metalness: 0.95
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    brakeGroup.add(discMesh);

    // Inner Rotor Hat (Aluminum Bell)
    const bellGeo = new THREE.CylinderGeometry(discRadius * 0.44, discRadius * 0.44, 0.026, 16);
    bellGeo.rotateZ(Math.PI / 2);
    const bellMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.35,
      metalness: 0.85
    });
    const bellMesh = new THREE.Mesh(bellGeo, bellMat);
    brakeGroup.add(bellMesh);

    // 2. High-Performance Multi-Piston Racing Caliper (Brembo Racing Red)
    const caliperGeo = new THREE.BoxGeometry(0.065, discRadius * 0.58, 0.10);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Bold Racing Red
      roughness: 0.25,
      metalness: 0.75
    });
    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
    caliperMesh.position.set(0, discRadius * 0.68, 0);
    brakeGroup.add(caliperMesh);

    return brakeGroup;
  }

  static buildSpoiler(parentGroup, type, carWidth, carHeight, carLength, carbonMat) {
    while (parentGroup.children.length > 0) {
      parentGroup.remove(parentGroup.children[0]);
    }

    if (type === 'none') return;

    if (type === 'ducktail') {
      const duckGeo = new THREE.BoxGeometry(carWidth * 0.86, 0.09, 0.14);
      const duckMesh = new THREE.Mesh(duckGeo, carbonMat);
      duckMesh.position.set(0, carHeight * 0.46, -carLength * 0.47);
      duckMesh.rotation.x = 0.32;
      duckMesh.castShadow = true;
      parentGroup.add(duckMesh);
      return;
    }

    // Wing Stanchions (Uprights)
    const wingHeight = type === 'carbon_super_wing' ? 0.38 : 0.26;
    const wingY = carHeight * 0.44 + wingHeight;
    const wingZ = -carLength * 0.44;

    const uprightGeo = new THREE.BoxGeometry(0.035, wingHeight, 0.12);
    const leftUpright = new THREE.Mesh(uprightGeo, carbonMat);
    leftUpright.position.set(-carWidth * 0.32, carHeight * 0.44 + wingHeight * 0.5, wingZ);
    leftUpright.castShadow = true;
    parentGroup.add(leftUpright);

    const rightUpright = new THREE.Mesh(uprightGeo, carbonMat);
    rightUpright.position.set(carWidth * 0.32, carHeight * 0.44 + wingHeight * 0.5, wingZ);
    rightUpright.castShadow = true;
    parentGroup.add(rightUpright);

    // Wing Blade (aerodynamic camber)
    const wingWidth = type === 'carbon_super_wing' ? carWidth * 1.06 : carWidth * 0.92;
    const wingChord = 0.26;
    const wingGeo = new THREE.BoxGeometry(wingWidth, 0.035, wingChord);
    const wingMesh = new THREE.Mesh(wingGeo, carbonMat);
    wingMesh.position.set(0, wingY, wingZ);
    wingMesh.rotation.x = -0.14; // angle of attack
    wingMesh.castShadow = true;
    parentGroup.add(wingMesh);

    // Aerodynamic Wing Endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.18, wingChord * 1.25);
    const leftEnd = new THREE.Mesh(endplateGeo, carbonMat);
    leftEnd.position.set(-wingWidth * 0.5, wingY, wingZ);
    parentGroup.add(leftEnd);

    const rightEnd = new THREE.Mesh(endplateGeo, carbonMat);
    rightEnd.position.set(wingWidth * 0.5, wingY, wingZ);
    parentGroup.add(rightEnd);
  }
}

