export const CAR_DEFINITIONS = [
  {
    id: 'street-gt',
    name: 'STREET GT',
    class: 'Sport Coupe',
    tagline: 'Precision Balanced All-Rounder',
    description: 'A finely balanced Japanese-inspired twin-turbo coupe. Nimble, forgiving, and an absolute joy to drive around tight technical corners.',
    price: 0,
    unlocked: true,
    stats: {
      speed: 78,
      acceleration: 75,
      handling: 82,
      braking: 80,
      drift: 76
    },
    physics: {
      mass: 1350,
      topSpeedKmh: 245,
      enginePower: 420, // HP
      torqueCurveMultiplier: 1.0,
      brakeTorque: 4200,
      maxSteerAngle: 0.58, // rad (~33 deg)
      steerSpeed: 4.8,
      tireGripFront: 1.35,
      tireGripRear: 1.30,
      driftFriction: 0.88,
      downforceCoeff: 1.2,
      dragCoeff: 0.32,
      gearRatios: [3.82, 2.36, 1.68, 1.31, 1.00, 0.79],
      reverseRatio: 3.50,
      finalDrive: 3.73,
      redlineRpm: 7800,
      idleRpm: 900
    },
    visuals: {
      bodyStyle: 'sport_coupe',
      length: 4.4,
      width: 1.85,
      height: 1.25,
      wheelRadius: 0.34,
      wheelWidth: 0.24,
      defaultColor: '#e62429',
      defaultSecondary: '#111111',
      spoilers: ['none', 'ducktail', 'sport_wing', 'gt_wing']
    }
  },
  {
    id: 'velocity-r',
    name: 'VELOCITY R',
    class: 'Lightweight Trackday',
    tagline: 'Blistering Twin-Turbo Acceleration',
    description: 'Stripped of all unnecessary weight and equipped with instant-spool twin turbos. Rockets out of apexes like a missile.',
    price: 18000,
    unlocked: false,
    stats: {
      speed: 84,
      acceleration: 94,
      handling: 86,
      braking: 85,
      drift: 79
    },
    physics: {
      mass: 1180,
      topSpeedKmh: 275,
      enginePower: 580,
      torqueCurveMultiplier: 1.25,
      brakeTorque: 4800,
      maxSteerAngle: 0.60,
      steerSpeed: 5.2,
      tireGripFront: 1.48,
      tireGripRear: 1.42,
      driftFriction: 0.90,
      downforceCoeff: 1.6,
      dragCoeff: 0.30,
      gearRatios: [3.90, 2.50, 1.82, 1.40, 1.10, 0.88],
      reverseRatio: 3.50,
      finalDrive: 3.91,
      redlineRpm: 8400,
      idleRpm: 950
    },
    visuals: {
      bodyStyle: 'track_special',
      length: 4.3,
      width: 1.90,
      height: 1.18,
      wheelRadius: 0.35,
      wheelWidth: 0.26,
      defaultColor: '#00d2ff',
      defaultSecondary: '#1a1a24',
      spoilers: ['sport_wing', 'gt_wing', 'carbon_super_wing']
    }
  },
  {
    id: 'torque-x',
    name: 'TORQUE X',
    class: 'American Muscle',
    tagline: 'Supercharged V8 Raw Torque & Drift King',
    description: 'A 6.8L supercharged muscle machine. Immense low-end grunt turns the rear tires to smoke on demand for glorious high-angle drifts.',
    price: 25000,
    unlocked: false,
    stats: {
      speed: 82,
      acceleration: 88,
      handling: 72,
      braking: 75,
      drift: 95
    },
    physics: {
      mass: 1650,
      topSpeedKmh: 265,
      enginePower: 670,
      torqueCurveMultiplier: 1.45,
      brakeTorque: 4600,
      maxSteerAngle: 0.64,
      steerSpeed: 4.4,
      tireGripFront: 1.30,
      tireGripRear: 1.22, // Easier drift initiation
      driftFriction: 0.82,
      downforceCoeff: 0.9,
      dragCoeff: 0.36,
      gearRatios: [3.65, 2.22, 1.55, 1.18, 0.92, 0.72],
      reverseRatio: 3.30,
      finalDrive: 3.55,
      redlineRpm: 6800,
      idleRpm: 800
    },
    visuals: {
      bodyStyle: 'muscle_car',
      length: 4.6,
      width: 1.94,
      height: 1.32,
      wheelRadius: 0.36,
      wheelWidth: 0.28,
      defaultColor: '#ff9900',
      defaultSecondary: '#111111',
      spoilers: ['none', 'ducktail', 'drag_wing']
    }
  },
  {
    id: 'apex-rs',
    name: 'APEX RS',
    class: 'GT3 Hypercar',
    tagline: 'Extreme Downforce & Surgical Cornering',
    description: 'Engineered strictly for surgical apex clipping. Generates colossal downforce, maintaining grip where other machines slide off into the barriers.',
    price: 42000,
    unlocked: false,
    stats: {
      speed: 88,
      acceleration: 90,
      handling: 98,
      braking: 96,
      drift: 70
    },
    physics: {
      mass: 1240,
      topSpeedKmh: 295,
      enginePower: 640,
      torqueCurveMultiplier: 1.18,
      brakeTorque: 5400,
      maxSteerAngle: 0.54,
      steerSpeed: 5.6,
      tireGripFront: 1.62,
      tireGripRear: 1.58,
      driftFriction: 0.94,
      downforceCoeff: 2.3,
      dragCoeff: 0.33,
      gearRatios: [3.45, 2.30, 1.70, 1.35, 1.12, 0.92],
      reverseRatio: 3.40,
      finalDrive: 4.10,
      redlineRpm: 8800,
      idleRpm: 1000
    },
    visuals: {
      bodyStyle: 'gt3_racer',
      length: 4.55,
      width: 1.98,
      height: 1.15,
      wheelRadius: 0.35,
      wheelWidth: 0.27,
      defaultColor: '#10b981',
      defaultSecondary: '#052e16',
      spoilers: ['gt_wing', 'carbon_super_wing']
    }
  },
  {
    id: 'phantom-gt',
    name: 'PHANTOM GT',
    class: 'Aerodynamic Hyper-Speed',
    tagline: 'Long-Tail Aerodynamic Speed Demon',
    description: 'Designed in a virtual wind tunnel to slice through the air with minimal drag. An unstoppable freight train on the longest straights.',
    price: 65000,
    unlocked: false,
    stats: {
      speed: 98,
      acceleration: 89,
      handling: 84,
      braking: 86,
      drift: 78
    },
    physics: {
      mass: 1380,
      topSpeedKmh: 340,
      enginePower: 820,
      torqueCurveMultiplier: 1.28,
      brakeTorque: 5200,
      maxSteerAngle: 0.52,
      steerSpeed: 4.9,
      tireGripFront: 1.44,
      tireGripRear: 1.40,
      driftFriction: 0.89,
      downforceCoeff: 1.5,
      dragCoeff: 0.25, // Ultra slippery
      gearRatios: [3.20, 2.10, 1.55, 1.20, 0.96, 0.76],
      reverseRatio: 3.20,
      finalDrive: 3.30,
      redlineRpm: 8200,
      idleRpm: 900
    },
    visuals: {
      bodyStyle: 'hypercar_longtail',
      length: 4.75,
      width: 1.95,
      height: 1.12,
      wheelRadius: 0.36,
      wheelWidth: 0.28,
      defaultColor: '#8b5cf6',
      defaultSecondary: '#1e1b4b',
      spoilers: ['active_aero', 'carbon_super_wing']
    }
  },
  {
    id: 'titan-v12',
    name: 'TITAN V12',
    class: 'Apex Monster',
    tagline: 'Unbridled 900+ HP V12 Fury',
    description: 'The pinnacle of combustion violence. Over 900 naturally aspirated horsepower that screams to 9,500 RPM. Demands absolute respect and razor-sharp reflexes.',
    price: 95000,
    unlocked: false,
    stats: {
      speed: 99,
      acceleration: 99,
      handling: 85,
      braking: 92,
      drift: 88
    },
    physics: {
      mass: 1420,
      topSpeedKmh: 360,
      enginePower: 920,
      torqueCurveMultiplier: 1.55,
      brakeTorque: 5800,
      maxSteerAngle: 0.56,
      steerSpeed: 5.0,
      tireGripFront: 1.52,
      tireGripRear: 1.46,
      driftFriction: 0.86,
      downforceCoeff: 1.9,
      dragCoeff: 0.28,
      gearRatios: [3.35, 2.25, 1.62, 1.25, 1.02, 0.82],
      reverseRatio: 3.30,
      finalDrive: 3.45,
      redlineRpm: 9500,
      idleRpm: 1100
    },
    visuals: {
      bodyStyle: 'v12_flagship',
      length: 4.68,
      width: 2.02,
      height: 1.14,
      wheelRadius: 0.37,
      wheelWidth: 0.30,
      defaultColor: '#ffd700',
      defaultSecondary: '#111111',
      spoilers: ['carbon_super_wing', 'gt_wing']
    }
  }
];

export const PAINT_PALETTE = [
  { name: 'Rosso Corsa', hex: '#e62429' },
  { name: 'Midnight Cyan', hex: '#00d2ff' },
  { name: 'Solar Flame', hex: '#ff9900' },
  { name: 'Emerald GT', hex: '#10b981' },
  { name: 'Ultraviolet', hex: '#8b5cf6' },
  { name: 'Liquid Gold', hex: '#ffd700' },
  { name: 'Stealth Matte Black', hex: '#1c1c1e' },
  { name: 'Polar White', hex: '#f8fafc' },
  { name: 'Nardo Grey', hex: '#64748b' },
  { name: 'Electric Pink', hex: '#ec4899' },
  { name: 'Miami Blue', hex: '#0284c7' },
  { name: 'Toxic Lime', hex: '#84cc16' }
];

export const PAINT_FINISHES = [
  { id: 'gloss', name: 'High Gloss', roughness: 0.15, metalness: 0.2, clearcoat: 0.9 },
  { id: 'metallic', name: 'Metallic Flake', roughness: 0.25, metalness: 0.85, clearcoat: 0.8 },
  { id: 'matte', name: 'Matte Satin', roughness: 0.75, metalness: 0.1, clearcoat: 0.05 },
  { id: 'pearl', name: 'Pearlescent', roughness: 0.20, metalness: 0.6, clearcoat: 1.0 }
];

export const RIM_STYLES = [
  { id: 'spoke5', name: 'V-Spoke 5 Race' },
  { id: 'spoke10', name: 'Mesh Multi-Spoke' },
  { id: 'turbofan', name: 'Aero Turbofan' },
  { id: 'gt_rim', name: 'Forged Monoblock' }
];
