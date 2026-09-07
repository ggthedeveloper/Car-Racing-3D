import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, UPGRADE_TYPES, REWARDS, DEFAULT_KEY_BINDINGS } from '../utils/constants';
import { CAR_DEFINITIONS } from '../vehicles/CarDefinitions';

const INITIAL_USER_DATA = {
  credits: 5000,
  xp: 0,
  level: 1,
  unlockedCars: ['street-gt'],
  selectedCarId: 'street-gt',
  selectedTrackId: 'city-circuit',
  carCustomizations: {
    'street-gt': { paintColor: '#e62429', finish: 'metallic', spoiler: 'sport_wing', rimStyle: 'spoke5' },
    'velocity-r': { paintColor: '#00d2ff', finish: 'gloss', spoiler: 'gt_wing', rimStyle: 'spoke10' },
    'torque-x': { paintColor: '#ff9900', finish: 'matte', spoiler: 'ducktail', rimStyle: 'gt_rim' },
    'apex-rs': { paintColor: '#10b981', finish: 'pearl', spoiler: 'carbon_super_wing', rimStyle: 'turbofan' },
    'phantom-gt': { paintColor: '#8b5cf6', finish: 'metallic', spoiler: 'carbon_super_wing', rimStyle: 'spoke10' },
    'titan-v12': { paintColor: '#ffd700', finish: 'gloss', spoiler: 'carbon_super_wing', rimStyle: 'gt_rim' }
  },
  carUpgrades: {
    'street-gt': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 },
    'velocity-r': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 },
    'torque-x': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 },
    'apex-rs': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 },
    'phantom-gt': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 },
    'titan-v12': { engine: 0, brakes: 0, tires: 0, suspension: 0, transmission: 0, aerodynamics: 0, nitro: 0 }
  },
  stats: {
    racesCompleted: 0,
    wins: 0,
    podiums: 0,
    totalDriftPoints: 0,
    bestLapTimes: {}
  }
};

const INITIAL_SETTINGS = {
  graphics: {
    quality: 'HIGH', // 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'
    shadows: true,
    effects: true,
    antialiasing: true,
    showFps: true
  },
  audio: {
    master: 0.8,
    music: 0.5,
    engine: 0.7,
    sfx: 0.8
  },
  controls: {
    mouseSteering: false,
    keyBindings: DEFAULT_KEY_BINDINGS
  },
  gameplay: {
    difficulty: 'NORMAL',
    steeringSensitivity: 1.0,
    cameraMode: 'CHASE'
  }
};

export function useGameState() {
  const [userData, setUserData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (saved) return { ...INITIAL_USER_DATA, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load user data from localStorage', e);
    }
    return INITIAL_USER_DATA;
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return INITIAL_SETTINGS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to persist user data', e);
    }
  }, [userData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to persist settings', e);
    }
  }, [settings]);

  const selectCar = useCallback((carId) => {
    setUserData((prev) => ({ ...prev, selectedCarId: carId }));
  }, []);

  const selectTrack = useCallback((trackId) => {
    setUserData((prev) => ({ ...prev, selectedTrackId: trackId }));
  }, []);

  const buyCar = useCallback((carDef) => {
    setUserData((prev) => {
      if (prev.credits < carDef.price || prev.unlockedCars.includes(carDef.id)) {
        return prev;
      }
      return {
        ...prev,
        credits: prev.credits - carDef.price,
        unlockedCars: [...prev.unlockedCars, carDef.id],
        selectedCarId: carDef.id
      };
    });
  }, []);

  const customizeCar = useCallback((carId, customObj) => {
    setUserData((prev) => {
      const existing = prev.carCustomizations[carId] || {};
      return {
        ...prev,
        carCustomizations: {
          ...prev.carCustomizations,
          [carId]: { ...existing, ...customObj }
        }
      };
    });
  }, []);

  const upgradeCar = useCallback((carId, upgradeCategory) => {
    setUserData((prev) => {
      const carUps = prev.carUpgrades[carId] || {};
      const currentLevel = carUps[upgradeCategory] || 0;
      const upgradeDef = UPGRADE_TYPES[upgradeCategory.toUpperCase()];

      if (!upgradeDef || currentLevel >= upgradeDef.maxLevel) return prev;
      const cost = upgradeDef.costs[currentLevel];
      if (prev.credits < cost) return prev;

      return {
        ...prev,
        credits: prev.credits - cost,
        carUpgrades: {
          ...prev.carUpgrades,
          [carId]: {
            ...carUps,
            [upgradeCategory]: currentLevel + 1
          }
        }
      };
    });
  }, []);

  const recordRaceResult = useCallback((result) => {
    // result: { position, bestLap, totalTime, driftScore, trackId }
    setUserData((prev) => {
      const pos = result.position || 8;
      const posReward = REWARDS.POSITION[pos - 1] || 150;
      const driftReward = Math.round((result.driftScore || 0) * REWARDS.DRIFT_FACTOR);
      const cleanBonus = result.damage < 15 ? REWARDS.CLEAN_RACE : 0;
      const totalCreditsEarned = posReward + driftReward + cleanBonus;

      const xpEarned = REWARDS.XP_POSITION[pos - 1] || 100;
      const newXp = prev.xp + xpEarned;
      const newLevel = Math.floor(newXp / 1000) + 1;

      const newStats = { ...prev.stats };
      newStats.racesCompleted = (newStats.racesCompleted || 0) + 1;
      if (pos === 1) newStats.wins = (newStats.wins || 0) + 1;
      if (pos <= 3) newStats.podiums = (newStats.podiums || 0) + 1;
      newStats.totalDriftPoints = (newStats.totalDriftPoints || 0) + (result.driftScore || 0);

      // Best lap record
      if (result.trackId && result.bestLap > 0) {
        const currentBest = newStats.bestLapTimes[result.trackId];
        if (!currentBest || result.bestLap < currentBest) {
          newStats.bestLapTimes[result.trackId] = result.bestLap;
        }
      }

      return {
        ...prev,
        credits: prev.credits + totalCreditsEarned,
        xp: newXp,
        level: newLevel,
        stats: newStats
      };
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
      graphics: { ...prev.graphics, ...(newSettings.graphics || {}) },
      audio: { ...prev.audio, ...(newSettings.audio || {}) },
      controls: { ...prev.controls, ...(newSettings.controls || {}) },
      gameplay: { ...prev.gameplay, ...(newSettings.gameplay || {}) }
    }));
  }, []);

  return {
    userData,
    settings,
    selectCar,
    selectTrack,
    buyCar,
    customizeCar,
    upgradeCar,
    recordRaceResult,
    updateSettings
  };
}
