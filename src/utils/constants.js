export const GAME_STATES = {
  MENU: 'MENU',
  GARAGE: 'GARAGE',
  CAR_SELECT: 'CAR_SELECT',
  TRACK_SELECT: 'TRACK_SELECT',
  LOADING: 'LOADING',
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  SETTINGS: 'SETTINGS'
};

export const CAMERA_MODES = {
  CHASE: 'CHASE',
  CLOSE_CHASE: 'CLOSE_CHASE',
  HOOD: 'HOOD',
  COCKPIT: 'COCKPIT',
  CINEMATIC: 'CINEMATIC'
};

export const WEATHER_MODES = {
  CLEAR: 'CLEAR',
  RAIN: 'RAIN',
  STORM: 'STORM',
  FOG: 'FOG'
};

export const TIME_OF_DAY = {
  MORNING: 'MORNING',
  DAY: 'DAY',
  EVENING: 'EVENING',
  NIGHT: 'NIGHT'
};

export const DIFFICULTY = {
  EASY: 'EASY',
  NORMAL: 'NORMAL',
  HARD: 'HARD',
  EXPERT: 'EXPERT'
};

export const DEFAULT_KEY_BINDINGS = {
  accelerate: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  handbrake: ['Space'],
  nitro: ['ShiftLeft', 'ShiftRight'],
  resetCar: ['KeyR'],
  changeCamera: ['KeyC'],
  pause: ['Escape']
};

export const UPGRADE_TYPES = {
  ENGINE: {
    id: 'engine',
    name: 'Engine Tuning',
    description: 'Increases top speed and progressive torque output.',
    maxLevel: 3,
    costs: [1500, 3500, 7000],
    statBonus: { topSpeed: [6, 14, 25], acceleration: [0.08, 0.18, 0.32] }
  },
  BRAKES: {
    id: 'brakes',
    name: 'Brembo Racing Brakes',
    description: 'Drastically shortens stopping distances with higher brake torque.',
    maxLevel: 3,
    costs: [1000, 2500, 5000],
    statBonus: { braking: [0.15, 0.32, 0.50] }
  },
  TIRES: {
    id: 'tires',
    name: 'Sticky Compound Tires',
    description: 'Improves cornering grip, lateral friction, and drift recovery.',
    maxLevel: 3,
    costs: [1200, 2800, 5800],
    statBonus: { handling: [0.12, 0.26, 0.42], tireGrip: [0.1, 0.22, 0.38] }
  },
  SUSPENSION: {
    id: 'suspension',
    name: 'Sport Coilover Suspension',
    description: 'Reduces body roll, sharpens steering response and stability.',
    maxLevel: 3,
    costs: [1400, 3000, 6200],
    statBonus: { handling: [0.10, 0.22, 0.35], stability: [0.15, 0.30, 0.45] }
  },
  TRANSMISSION: {
    id: 'transmission',
    name: 'Sequential Gearbox',
    description: 'Provides faster shift times and optimized high-speed ratios.',
    maxLevel: 3,
    costs: [1800, 4000, 8000],
    statBonus: { acceleration: [0.12, 0.25, 0.40] }
  },
  AERODYNAMICS: {
    id: 'aerodynamics',
    name: 'Carbon Aero Package',
    description: 'Generates high-speed downforce for glued-to-the-road cornering.',
    maxLevel: 3,
    costs: [1600, 3600, 7500],
    statBonus: { downforce: [0.2, 0.45, 0.75], handling: [0.08, 0.18, 0.30] }
  },
  NITRO: {
    id: 'nitro',
    name: 'Nitrous Oxide System (NOS)',
    description: 'Increases nitro duration, thrust multiplier, and recharge rate.',
    maxLevel: 3,
    costs: [2000, 4500, 9000],
    statBonus: { nitroBoost: [0.15, 0.35, 0.60], nitroDuration: [1.0, 2.5, 4.5] }
  }
};

export const STORAGE_KEYS = {
  USER_DATA: 'turborush3d_userdata_v1',
  SETTINGS: 'turborush3d_settings_v1',
  BEST_TIMES: 'turborush3d_best_times_v1'
};

export const REWARDS = {
  POSITION: [3500, 2400, 1600, 1000, 700, 500, 350, 200], // 1st to 8th
  FASTEST_LAP: 500,
  CLEAN_RACE: 600,
  DRIFT_FACTOR: 0.1, // credits per drift point
  XP_POSITION: [1000, 750, 550, 400, 300, 200, 150, 100]
};
