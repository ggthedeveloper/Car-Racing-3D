import * as THREE from 'three';

export const TRACK_DEFINITIONS = [
  {
    id: 'city-circuit',
    name: 'CITY CIRCUIT',
    theme: 'city',
    tagline: 'Neon Metropolis GP',
    description: 'High-speed urban warfare through towering skyscrapers, dramatic overpasses, and razor-sharp 90-degree street corners.',
    difficulty: 'MEDIUM',
    lengthKm: 3.2,
    defaultLaps: 3,
    roadWidth: 16.0,
    barrierHeight: 1.8,
    ambientColor: 0x475569,
    skyColor: 0x38bdf8,
    groundColor: 0x22262e,
    fogDensity: 0.0008,
    defaultTime: 'DAY',
    defaultWeather: 'CLEAR',
    // 3D spline control points (X, Y, Z) forming a closed technical circuit
    controlPoints: [
      new THREE.Vector3(0, 0, 0),        // Start / Finish Straight
      new THREE.Vector3(0, 0, 180),
      new THREE.Vector3(30, 0, 320),      // Turn 1 sweeping right
      new THREE.Vector3(120, 0, 390),
      new THREE.Vector3(260, 0, 390),     // Turn 2 90 deg right onto Downtown Ave
      new THREE.Vector3(360, 0, 300),
      new THREE.Vector3(380, 4, 150),     // Flyover elevated ramp climb
      new THREE.Vector3(360, 8, -40),     // Elevated expressway section
      new THREE.Vector3(280, 8, -180),    // High-speed S-bends over highway
      new THREE.Vector3(180, 4, -280),    // Downhill ramp off flyover
      new THREE.Vector3(80, 0, -320),     // Underpass chicane
      new THREE.Vector3(-80, 0, -320),    // High-speed back straight
      new THREE.Vector3(-220, 0, -280),   // Turn 5 hard left around financial tower
      new THREE.Vector3(-300, 0, -160),
      new THREE.Vector3(-310, 0, 0),      // West boulevard
      new THREE.Vector3(-250, 0, 140),    // Sharp hairpin right into main plaza
      new THREE.Vector3(-140, 0, 160),
      new THREE.Vector3(-80, 0, 60),      // Final chicane leading to start straight
      new THREE.Vector3(-30, 0, -40)
    ],
    features: {
      hasBuildings: true,
      buildingDensity: 'high',
      hasStreetlights: true,
      hasNeonSigns: true,
      hasTunnels: true,
      tunnelIndices: [[7, 9]],
      hasOverpass: true,
      treeDensity: 'low',
      hasOcean: false
    }
  },
  {
    id: 'mountain-pass',
    name: 'MOUNTAIN PASS',
    theme: 'mountain',
    tagline: 'Fujimi Touge Climb',
    description: 'Breathtaking mountain pass carved into sheer alpine rock faces. Features dramatic elevation drops, technical hairpin turns, and a carved rock tunnel.',
    difficulty: 'HARD',
    lengthKm: 4.1,
    defaultLaps: 2,
    roadWidth: 14.5,
    barrierHeight: 1.5,
    ambientColor: 0x3a483a,
    skyColor: 0x7eb0d5,
    groundColor: 0x2d3a24,
    fogDensity: 0.0025,
    defaultTime: 'MORNING',
    defaultWeather: 'CLEAR',
    controlPoints: [
      new THREE.Vector3(0, 5, 0),         // Valley starting straight
      new THREE.Vector3(50, 8, 140),
      new THREE.Vector3(160, 15, 230),    // Mountain climb commences
      new THREE.Vector3(260, 26, 280),
      new THREE.Vector3(340, 38, 220),    // Hairpin 1 right (uphill)
      new THREE.Vector3(310, 48, 100),
      new THREE.Vector3(360, 58, -20),    // Ridge crossing
      new THREE.Vector3(450, 64, -120),   // Hairpin 2 left at peak vista
      new THREE.Vector3(400, 54, -240),
      new THREE.Vector3(290, 42, -320),   // Mountain rock tunnel entry
      new THREE.Vector3(150, 32, -340),   // Inside mountain cavern
      new THREE.Vector3(30, 22, -320),    // Tunnel exit onto cliffside drop
      new THREE.Vector3(-90, 16, -260),
      new THREE.Vector3(-190, 12, -180),  // Downhill switchback S-curves
      new THREE.Vector3(-270, 8, -60),
      new THREE.Vector3(-310, 6, 60),     // Lakeside perimeter
      new THREE.Vector3(-250, 4, 180),    // High-speed sweep
      new THREE.Vector3(-140, 4, 140),    // Valley return
      new THREE.Vector3(-60, 4, 40)
    ],
    features: {
      hasBuildings: false,
      hasStreetlights: false,
      hasNeonSigns: false,
      hasTunnels: true,
      tunnelIndices: [[9, 12]],
      hasMountains: true,
      hasCliffs: true,
      treeDensity: 'high',
      treeType: 'pine',
      hasOcean: false
    }
  },
  {
    id: 'desert-circuit',
    name: 'DESERT CIRCUIT',
    theme: 'desert',
    tagline: 'Canyon Super Speedway',
    description: 'Blisteringly fast canyon highway cutting through sun-baked red rock mesas and open desert dunes. Long wide straights built for top speed.',
    difficulty: 'EASY',
    lengthKm: 3.8,
    defaultLaps: 3,
    roadWidth: 17.5,
    barrierHeight: 1.4,
    ambientColor: 0x5c4228,
    skyColor: 0xffcc88,
    groundColor: 0xb47942,
    fogDensity: 0.0012,
    defaultTime: 'DAY',
    defaultWeather: 'CLEAR',
    controlPoints: [
      new THREE.Vector3(0, 0, 0),         // Massive start straight
      new THREE.Vector3(0, 0, 260),
      new THREE.Vector3(40, 0, 440),
      new THREE.Vector3(160, 0, 540),     // Super-banked Turn 1
      new THREE.Vector3(340, 2, 540),     // Canyon opening
      new THREE.Vector3(480, 4, 420),
      new THREE.Vector3(540, 2, 240),     // Red rock gorge straight
      new THREE.Vector3(500, 0, 40),
      new THREE.Vector3(400, 0, -140),    // Wide sweeping curve
      new THREE.Vector3(260, 0, -280),    // Oasis chicane
      new THREE.Vector3(120, 2, -360),
      new THREE.Vector3(-40, 0, -380),    // South mesa straight
      new THREE.Vector3(-220, 0, -320),
      new THREE.Vector3(-360, 0, -180),   // Dune crossing
      new THREE.Vector3(-400, 0, 0),
      new THREE.Vector3(-340, 0, 160),    // Turn 10 right entry
      new THREE.Vector3(-220, 0, 220),    // Return sweep
      new THREE.Vector3(-100, 0, 100)
    ],
    features: {
      hasBuildings: false,
      hasStreetlights: false,
      hasNeonSigns: false,
      hasTunnels: false,
      hasMountains: true,
      mountainStyle: 'red_mesa',
      treeDensity: 'sparse',
      treeType: 'cactus',
      hasRocks: true,
      hasOcean: false
    }
  },
  {
    id: 'coastal-circuit',
    name: 'COASTAL CIRCUIT',
    theme: 'coastal',
    tagline: 'Riviera Ocean Expressway',
    description: 'Paradise racing along golden beaches, swaying palm trees, and panoramic ocean suspension bridges glowing under a stunning sunset.',
    difficulty: 'NORMAL',
    lengthKm: 3.5,
    defaultLaps: 3,
    roadWidth: 16.0,
    barrierHeight: 1.6,
    ambientColor: 0x483d8b,
    skyColor: 0xff7b54,
    groundColor: 0xd2b48c,
    fogDensity: 0.0015,
    defaultTime: 'EVENING',
    defaultWeather: 'CLEAR',
    controlPoints: [
      new THREE.Vector3(0, 0, 0),         // Seaside boulevard
      new THREE.Vector3(30, 0, 200),
      new THREE.Vector3(90, 0, 340),      // Beachside curve
      new THREE.Vector3(200, 3, 420),     // Suspension bridge approach
      new THREE.Vector3(340, 10, 440),    // Ocean suspension bridge main span
      new THREE.Vector3(480, 10, 380),
      new THREE.Vector3(560, 4, 260),     // Island landfall
      new THREE.Vector3(560, 0, 100),     // Marina curve
      new THREE.Vector3(480, 0, -60),
      new THREE.Vector3(360, 2, -180),    // Peninsula cliffside
      new THREE.Vector3(220, 4, -260),
      new THREE.Vector3(80, 4, -300),     // Ocean causeway return
      new THREE.Vector3(-80, 2, -280),
      new THREE.Vector3(-200, 0, -200),   // Palm grove S-turns
      new THREE.Vector3(-280, 0, -80),
      new THREE.Vector3(-300, 0, 60),     // Coastal resort straight
      new THREE.Vector3(-220, 0, 180),    // Yacht club hairpin
      new THREE.Vector3(-100, 0, 140),
      new THREE.Vector3(-40, 0, 40)
    ],
    features: {
      hasBuildings: true,
      buildingDensity: 'low_resort',
      hasStreetlights: true,
      hasNeonSigns: false,
      hasTunnels: false,
      hasOcean: true,
      hasBridges: true,
      bridgeIndices: [[3, 6]],
      treeDensity: 'medium',
      treeType: 'palm'
    }
  }
];
