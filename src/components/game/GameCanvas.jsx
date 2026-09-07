import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VehiclePhysics } from '../../physics/VehiclePhysics';
import { CollisionSystem } from '../../physics/CollisionSystem';
import { CarBuilder } from '../../vehicles/CarBuilder';
import { VehicleVisuals } from '../../vehicles/VehicleVisuals';
import { CAR_DEFINITIONS } from '../../vehicles/CarDefinitions';
import { TrackBuilder } from '../../tracks/TrackBuilder';
import { TrackManager } from '../../tracks/TrackManager';
import { TRACK_DEFINITIONS } from '../../tracks/TrackDefinitions';
import { AIManager } from '../../ai/AIManager';
import { CameraSystem } from '../../camera/CameraSystem';
import { ParticleSystem } from '../../effects/ParticleSystem';
import { SkidmarkSystem } from '../../effects/SkidmarkSystem';
import { WeatherManager } from '../../effects/WeatherManager';
import { TimeOfDayManager } from '../../effects/TimeOfDayManager';
import { TrafficManager } from '../../ai/TrafficManager';
import { SpeedLinesSystem } from '../../effects/SpeedLinesSystem';
import { audioManager } from '../../audio/AudioManager';

function GameCanvasComponent({
  gameState,
  userData,
  settings,
  raceConfig,
  pollInputs,
  consumePulse,
  onTelemetryUpdate,
  onFinishRace,
  onPause
}) {
  const mountRef = useRef(null);
  const speedLinesCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isRacingMode = ['COUNTDOWN', 'RACING', 'PAUSED', 'FINISHED'].includes(gameState);

  // Initialize or re-configure Three.js engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. THREE.JS CORE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);

    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.2, 2000);
    camera.position.set(0, 3, -7);

    const renderer = new THREE.WebGLRenderer({
      antialias: settings.graphics?.antialiasing !== false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    if (settings.graphics?.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild(renderer.domElement);

    // --- 2. LIGHTING & ENVIRONMENT ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(100, 160, 60);
    dirLight.castShadow = !!settings.graphics?.shadows;
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 400;
      const d = 60;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    // --- 3. MANAGERS & SUBSYSTEMS ---
    const cameraSystem = new CameraSystem(camera);
    const particleSystem = new ParticleSystem(scene);
    const skidmarkSystem = new SkidmarkSystem(scene);
    const weatherManager = new WeatherManager(scene);
    const timeOfDayManager = new TimeOfDayManager(scene, dirLight, ambientLight);

    // 2D Speed Lines canvas overlay system
    let speedLinesSystem = null;
    if (speedLinesCanvasRef.current) {
      speedLinesCanvasRef.current.width = container.clientWidth;
      speedLinesCanvasRef.current.height = container.clientHeight;
      speedLinesSystem = new SpeedLinesSystem(speedLinesCanvasRef.current);
    }

    // --- 4. BUILD SCENE BASED ON GAME STATE ---
    let currentTrackDef = null;
    let trackMeshObj = null;
    let trackManager = null;
    let collisionSystem = null;
    let playerPhysics = null;
    let playerVisuals = null;
    let aiManager = null;
    let trafficManager = null;

    const currentCarDef = CAR_DEFINITIONS.find((c) => c.id === userData.selectedCarId) || CAR_DEFINITIONS[0];
    const custom = userData.carCustomizations[currentCarDef.id] || {};
    const carUpgrades = userData.carUpgrades[currentCarDef.id] || {};

    if (isRacingMode) {
      const trackId = raceConfig?.trackId || userData.selectedTrackId || 'city-circuit';
      currentTrackDef = TRACK_DEFINITIONS.find((t) => t.id === trackId) || TRACK_DEFINITIONS[0];

      // Build 3D Track
      trackMeshObj = TrackBuilder.buildTrack(currentTrackDef);
      scene.add(trackMeshObj.root);

      weatherManager.setRoadMaterial(trackMeshObj.roadMaterial);
      weatherManager.setWeather(raceConfig?.weather || currentTrackDef.defaultWeather || 'CLEAR');
      timeOfDayManager.setTimeOfDay(raceConfig?.timeOfDay || currentTrackDef.defaultTime || 'DAY');

      collisionSystem = new CollisionSystem(trackMeshObj.trackData);
      trackManager = new TrackManager(trackMeshObj.trackData, raceConfig?.laps || currentTrackDef.defaultLaps || 3);

      // Starting Grid
      const gridSlots = trackManager.getGridPositions(8);

      // Player Vehicle
      playerPhysics = new VehiclePhysics(currentCarDef, carUpgrades);
      playerPhysics.reset(gridSlots[0].position.clone(), gridSlots[0].yaw);

      const playerCarMeshObj = CarBuilder.buildCarMesh(
        currentCarDef,
        custom.paintColor,
        custom.finish || 'metallic',
        custom.spoiler || 'sport_wing',
        custom.rimStyle || 'spoke5',
        true
      );
      scene.add(playerCarMeshObj.root);
      playerVisuals = new VehicleVisuals(playerCarMeshObj);

      // AI Racers
      aiManager = new AIManager(scene, collisionSystem, raceConfig?.difficulty || 'NORMAL');
      aiManager.spawnGrid(gridSlots, 7);

      // Civilian Traffic on city & highway tracks
      if (currentTrackDef.features?.hasTraffic) {
        trafficManager = new TrafficManager(scene);
        const trafficCount = settings.graphics?.quality === 'LOW' ? 8 : 14;
        trafficManager.spawnTraffic(trackMeshObj.trackData, trafficCount);
      }

      audioManager.startMusic();
    } else {
      // MENU & GARAGE SHOWROOM
      timeOfDayManager.setTimeOfDay('DAY');
      weatherManager.setWeather('CLEAR');

      // Showroom floor podium
      const floorGeo = new THREE.CylinderGeometry(8.0, 8.2, 0.35, 48);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.15,
        metalness: 0.85
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = -0.18;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Showroom ambient ring
      const ringGeo = new THREE.TorusGeometry(7.8, 0.08, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.01;
      scene.add(ringMesh);

      // Player Car Showcase Mesh
      const playerCarMeshObj = CarBuilder.buildCarMesh(
        currentCarDef,
        custom.paintColor,
        custom.finish || 'metallic',
        custom.spoiler || 'sport_wing',
        custom.rimStyle || 'spoke5'
      );
      scene.add(playerCarMeshObj.root);
      playerVisuals = new VehicleVisuals(playerCarMeshObj);
      playerVisuals.setHeadlights(false);

      playerPhysics = new VehiclePhysics(currentCarDef, {});
      playerPhysics.reset(new THREE.Vector3(0, 0, 0), 0);
    }

    // Save engine references
    engineRef.current = {
      scene,
      camera,
      renderer,
      cameraSystem,
      particleSystem,
      skidmarkSystem,
      weatherManager,
      timeOfDayManager,
      speedLinesSystem,
      trackData: trackMeshObj?.trackData,
      trackManager,
      collisionSystem,
      playerPhysics,
      playerVisuals,
      aiManager,
      trafficManager,
      isRacingMode
    };

    // --- 5. WINDOW RESIZE HANDLER ---
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      if (speedLinesSystem) {
        speedLinesSystem.resize(container.clientWidth, container.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // --- 6. ANIMATION GAME LOOP ---
    let animId = null;
    let lastTime = performance.now();
    let showroomAngle = 0;
    let telemetryThrottleTimer = 0;
    let prevNitroTier = 0;
    let prevIsShifting = false;

    const gameLoop = (now) => {
      animId = requestAnimationFrame(gameLoop);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const engine = engineRef.current;
      if (!engine) return;

      const isNight = engine.timeOfDayManager.isNightOrDark();
      const currentGameState = gameStateRef.current;

      if (isRacingMode && engine.playerPhysics) {
        if (currentGameState === 'PAUSED') {
          renderer.render(scene, camera);
          return;
        }

        const canControl = currentGameState === 'RACING';
        const rawInputs = canControl ? pollInputs() : { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };

        // Handle single pulse actions
        if (consumePulse('resetCar')) {
          const closest = engine.trackData?.getClosestSample(engine.playerPhysics.position);
          if (closest && closest.sample) {
            const resetPos = closest.sample.position.clone();
            resetPos.y += 0.5;
            const yaw = Math.atan2(closest.sample.tangent.x, closest.sample.tangent.z);
            engine.playerPhysics.reset(resetPos, yaw);
          }
        }

        if (consumePulse('changeCamera')) {
          engine.cameraSystem.cycleMode();
        }

        if (consumePulse('pause') && currentGameState === 'RACING') {
          onPause();
        }

        // 1. Update Player Physics
        const surfaceFriction = engine.weatherManager.surfaceFriction;
        engine.playerPhysics.update(rawInputs, dt, surfaceFriction, engine.trackData);

        // 2. Track & Vehicle Collisions
        if (engine.collisionSystem) {
          engine.collisionSystem.resolveTrackBoundaries(engine.playerPhysics, (impact) => {
            audioManager.playCollision(impact.intensity);
            engine.cameraSystem.triggerShake(impact.intensity);
            engine.particleSystem.emitCollisionSparks(impact.position, impact.normal);
          });

          // Car to car collisions between player and AI
          engine.aiManager?.racers.forEach((ai) => {
            engine.collisionSystem.resolveVehicleVehicle(engine.playerPhysics, ai.physics, (impact) => {
              audioManager.playCollision(impact.intensity);
              engine.cameraSystem.triggerShake(impact.intensity * 0.7);
              engine.particleSystem.emitCollisionSparks(impact.position, impact.normal);
            });
          });

          // Collisions between player and civilian traffic
          if (engine.trafficManager) {
            engine.trafficManager.trafficCars.forEach((tc) => {
              const col = engine.collisionSystem.resolveVehicleTraffic(engine.playerPhysics, tc, (impact) => {
                audioManager.playCollision(impact.intensity);
                engine.cameraSystem.triggerShake(impact.intensity * 0.85);
                engine.particleSystem.emitCollisionSparks(impact.position, impact.normal);
              });
              if (col && col.nearMiss) {
                audioManager.playBlowOffValve();
              }
            });
          }
        }

        // 3. Update AI Opponents & Civilian Traffic
        engine.trafficManager?.update(dt, engine.trackData, engine.playerPhysics.position);
        engine.aiManager?.update(dt, engine.trackData, engine.playerPhysics, isNight, engine.trafficManager?.trafficCars);

        // 4. Update Race Progress & Standings
        if (engine.trackManager) {
          engine.trackManager.update(dt, engine.playerPhysics, engine.aiManager?.racers || [], currentGameState === 'RACING');

          if (engine.trackManager.isFinished && currentGameState === 'RACING') {
            onFinishRace({
              position: engine.trackManager.getPlayerPosition(),
              totalTime: engine.trackManager.totalRaceTime,
              bestLap: engine.trackManager.bestLapTime,
              driftScore: engine.playerPhysics.driftScore,
              damage: engine.playerPhysics.damage,
              trackId: currentTrackDef?.id
            });
          }
        }

        // 5. FX: Tire Smoke & Skid Marks on hard slip / handbrake
        const rearWheelL = engine.playerVisuals?.wheelNodes?.find((w) => w.id === 'RL');
        const rearWheelR = engine.playerVisuals?.wheelNodes?.find((w) => w.id === 'RR');

        if (engine.playerPhysics.isDrifting || rawInputs.handbrake) {
          const lPos = new THREE.Vector3();
          const rPos = new THREE.Vector3();
          if (rearWheelL && rearWheelL.steerPivot) rearWheelL.steerPivot.getWorldPosition(lPos);
          if (rearWheelR && rearWheelR.steerPivot) rearWheelR.steerPivot.getWorldPosition(rPos);

          const surfParticle = engine.playerPhysics.currentSurface?.particle || 'smoke';
          engine.particleSystem.emitTireSmoke(lPos, engine.playerPhysics.velocity, 1.2, surfParticle);
          engine.particleSystem.emitTireSmoke(rPos, engine.playerPhysics.velocity, 1.2, surfParticle);
          engine.skidmarkSystem.addSkid(lPos, rPos, 1.0);
        } else {
          engine.skidmarkSystem.resetStreak();
        }

        // 6. FX: Exhaust Nitro Flames (Multi-tier)
        const leftFlamePt = new THREE.Vector3();
        const rightFlamePt = new THREE.Vector3();
        if (engine.playerVisuals?.meshObj?.leftFlamePoint) {
          engine.playerVisuals.meshObj.leftFlamePoint.getWorldPosition(leftFlamePt);
          engine.playerVisuals.meshObj.rightFlamePoint.getWorldPosition(rightFlamePt);
        }
        engine.particleSystem.updateNitroFlames(
          leftFlamePt,
          rightFlamePt,
          engine.playerPhysics.forward,
          engine.playerPhysics.nitroActive,
          engine.playerPhysics.nitroTier
        );

        // 7. FX: Weather & Lightning
        engine.weatherManager.update(dt);
        const isRaining = ['RAIN', 'STORM'].includes(engine.weatherManager.currentMode);
        engine.particleSystem.update(dt, engine.camera.position, isRaining);

        // 8. 2D Speed Lines Overlay Update
        engine.speedLinesSystem?.update(dt, engine.playerPhysics.speedKmh, engine.playerPhysics.nitroTier);

        // 9. Update Audio & Sound Events
        if (engine.playerPhysics.nitroTier === 2 && prevNitroTier !== 2) {
          audioManager.playPerfectNitro();
        }
        if (engine.playerPhysics.isShifting && !prevIsShifting) {
          audioManager.playBlowOffValve();
        }
        prevNitroTier = engine.playerPhysics.nitroTier;
        prevIsShifting = engine.playerPhysics.isShifting;

        audioManager.updateEngine(
          engine.playerPhysics.rpm,
          rawInputs.throttle,
          engine.playerPhysics.speedKmh,
          engine.playerPhysics.gear
        );
        audioManager.updateTireScreech(
          Math.abs(engine.playerPhysics.lateralSlip),
          engine.playerPhysics.isDrifting
        );
        audioManager.updateWind(engine.playerPhysics.speedKmh);
        audioManager.setNitroActive(engine.playerPhysics.nitroActive, engine.playerPhysics.nitroTier);

        // 10. Update Player Visuals & Dynamic Camera
        engine.playerVisuals?.update(engine.playerPhysics, isNight);
        engine.cameraSystem.update(dt, engine.playerPhysics);

        // Update sunlight shadow position to track player car
        dirLight.position.set(
          engine.playerPhysics.position.x + 80,
          engine.playerPhysics.position.y + 140,
          engine.playerPhysics.position.z + 60
        );
        dirLight.target.position.copy(engine.playerPhysics.position);

        // 11. Direct HUD Telemetry Throttle
        telemetryThrottleTimer += dt;
        if (telemetryThrottleTimer > 0.066) { // ~15 fps HUD sync
          telemetryThrottleTimer = 0;
          if (onTelemetryUpdate) {
            onTelemetryUpdate({
              speedKmh: engine.playerPhysics.speedKmh,
              rpm: engine.playerPhysics.rpm,
              redlineRpm: engine.playerPhysics.redlineRpm,
              gear: engine.playerPhysics.gear,
              nitro: engine.playerPhysics.nitroAmount,
              nitroTier: engine.playerPhysics.nitroTier,
              isPerfectNitroReady: engine.playerPhysics.isPerfectNitroReady,
              isDrafting: engine.playerPhysics.isDrafting,
              currentSurface: engine.playerPhysics.currentSurface?.name || 'Asphalt',
              damage: engine.playerPhysics.damage,
              position: engine.trackManager?.getPlayerPosition() || 1,
              totalRacers: 8,
              currentLap: engine.trackManager?.currentLap || 1,
              currentLapTime: engine.trackManager?.currentLapTime || 0,
              bestLapTime: engine.trackManager?.bestLapTime || 0,
              totalRaceTime: engine.trackManager?.totalRaceTime || 0,
              isDrifting: engine.playerPhysics.isDrifting,
              driftAngle: engine.playerPhysics.driftAngle,
              driftScore: engine.playerPhysics.driftScore + Math.round(engine.playerPhysics.currentDriftScore * engine.playerPhysics.driftMultiplier),
              driftMultiplier: engine.playerPhysics.driftMultiplier,
              isWrongWay: engine.trackManager?.isWrongWay || false,
              playerPos: engine.playerPhysics.position,
              playerYaw: engine.playerPhysics.rotation.y,
              aiPositions: engine.aiManager?.racers.map((r) => ({ position: r.physics.position })) || [],
              trafficPositions: engine.trafficManager?.trafficCars.map((c) => ({ position: c.position })) || [],
              trackData: engine.trackData
            });
          }
        }
      } else {
        // MENU / GARAGE SHOWROOM CAMERA ORBIT
        showroomAngle += dt * 0.45;
        const camDist = 5.8;
        const camHeight = 1.9;
        camera.position.set(
          Math.sin(showroomAngle) * camDist,
          camHeight,
          Math.cos(showroomAngle) * camDist
        );
        camera.lookAt(0, 0.75, 0);

        engine.playerVisuals?.update(engine.playerPhysics, false);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(gameLoop);

    // CLEANUP ON UNMOUNT
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      audioManager.stopMusic();

      engineRef.current?.trafficManager?.cleanup();
      engineRef.current?.aiManager?.cleanup();
      engineRef.current?.playerVisuals?.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      engineRef.current = null;
    };
  }, [
    isRacingMode,
    raceConfig,
    userData.selectedCarId,
    userData.selectedTrackId,
    userData.carCustomizations,
    userData.carUpgrades,
    settings.graphics?.shadows,
    settings.graphics?.antialiasing,
    settings.graphics?.quality
  ]);

  return (
    <div
      ref={mountRef}
      className="game-canvas-container"
      style={{ width: '100vw', height: '100vh', position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <canvas
        ref={speedLinesCanvasRef}
        className="speed-lines-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
      />
    </div>
  );
}

export const GameCanvas = React.memo(GameCanvasComponent, (prevProps, nextProps) => {
  return (
    prevProps.gameState === nextProps.gameState &&
    prevProps.userData === nextProps.userData &&
    prevProps.settings === nextProps.settings &&
    prevProps.raceConfig === nextProps.raceConfig
  );
});
