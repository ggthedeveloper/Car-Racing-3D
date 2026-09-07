import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { MainMenu } from './components/ui/MainMenu';
import { Garage } from './components/ui/Garage';
import { TrackSelect } from './components/ui/TrackSelect';
import { CarSelect } from './components/ui/CarSelect';
import { RaceHUD } from './components/ui/RaceHUD';
import { CountdownOverlay } from './components/ui/CountdownOverlay';
import { PauseMenu } from './components/ui/PauseMenu';
import { RaceResults } from './components/ui/RaceResults';
import { SettingsModal } from './components/ui/SettingsModal';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { useGameState } from './hooks/useGameState';
import { usePlayerControls } from './hooks/usePlayerControls';
import { audioManager } from './audio/AudioManager';
import { GAME_STATES } from './utils/constants';

export function App() {
  const {
    userData,
    settings,
    selectCar,
    selectTrack,
    buyCar,
    customizeCar,
    upgradeCar,
    recordRaceResult,
    updateSettings
  } = useGameState();

  const [gameState, setGameState] = useState(GAME_STATES.LOADING);
  const [showSettings, setShowSettings] = useState(false);
  const [raceConfig, setRaceConfig] = useState(null);
  const [countdownStep, setCountdownStep] = useState(null);
  const [raceResults, setRaceResults] = useState(null);
  const [cameraMode, setCameraMode] = useState('CHASE');

  // Fast direct HUD telemetry state
  const [telemetry, setTelemetry] = useState(null);

  // Player controls hook
  const { pollInputs, consumePulse } = usePlayerControls(settings.controls?.keyBindings, {
    mouseSteering: settings.controls?.mouseSteering
  });

  // Handle Initial Loading Done
  const handleLoadingComplete = () => {
    setGameState(GAME_STATES.MENU);
  };

  // Start Race with Countdown
  const handleStartRace = useCallback((config) => {
    setRaceConfig(config);
    setGameState(GAME_STATES.COUNTDOWN);
    setCountdownStep(3);

    audioManager.init();
    audioManager.resume();
    audioManager.playCountdown(3);

    setTimeout(() => {
      setCountdownStep(2);
      audioManager.playCountdown(2);
      setTimeout(() => {
        setCountdownStep(1);
        audioManager.playCountdown(1);
        setTimeout(() => {
          setCountdownStep(0); // GO!
          audioManager.playCountdown(0);
          setGameState(GAME_STATES.RACING);

          setTimeout(() => {
            setCountdownStep(null);
          }, 900);
        }, 1000);
      }, 1000);
    }, 1000);
  }, []);

  // Handle Race Finish
  const handleFinishRace = useCallback((results) => {
    recordRaceResult(results);
    setRaceResults(results);
    setGameState(GAME_STATES.FINISHED);
  }, [recordRaceResult]);

  // Restart Current Race
  const handleRestartRace = useCallback(() => {
    if (raceConfig) {
      handleStartRace({ ...raceConfig, restartKey: Date.now() });
    }
  }, [raceConfig, handleStartRace]);

  // Next Race Sequence
  const handleNextRace = useCallback(() => {
    setGameState(GAME_STATES.TRACK_SELECT);
  }, []);

  // Cycle Camera Mode
  const handleCameraChange = useCallback(() => {
    const modes = ['CHASE', 'CLOSE_CHASE', 'HOOD', 'COCKPIT', 'CINEMATIC'];
    const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
    setCameraMode(modes[nextIdx]);
  }, [cameraMode]);

  const handlePause = useCallback(() => {
    setGameState(GAME_STATES.PAUSED);
  }, []);

  return (
    <div className="game-app-container">
      {/* THREE.JS GAME CANVAS */}
      <GameCanvas
        gameState={gameState}
        userData={userData}
        settings={settings}
        raceConfig={raceConfig}
        pollInputs={pollInputs}
        consumePulse={consumePulse}
        onTelemetryUpdate={setTelemetry}
        onFinishRace={handleFinishRace}
        onPause={handlePause}
      />

      {/* 1. INITIAL LOADING SCREEN */}
      {gameState === GAME_STATES.LOADING && (
        <LoadingScreen onLoaded={handleLoadingComplete} />
      )}

      {/* 2. MAIN MENU */}
      {gameState === GAME_STATES.MENU && (
        <MainMenu
          userData={userData}
          onNavigate={(targetState) => setGameState(targetState)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 3. 3D GARAGE */}
      {gameState === GAME_STATES.GARAGE && (
        <Garage
          userData={userData}
          onSelectCar={selectCar}
          onBuyCar={buyCar}
          onCustomizeCar={customizeCar}
          onUpgradeCar={upgradeCar}
          onBack={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      {/* 4. CAR SELECTION SCREEN */}
      {gameState === GAME_STATES.CAR_SELECT && (
        <CarSelect
          userData={userData}
          onSelectCar={selectCar}
          onBuyCar={buyCar}
          onNavigate={(targetState) => setGameState(targetState)}
          onBack={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      {/* 5. TRACK SELECTION SCREEN */}
      {gameState === GAME_STATES.TRACK_SELECT && (
        <TrackSelect
          selectedTrackId={userData.selectedTrackId}
          selectedCarId={userData.selectedCarId}
          onSelectTrack={selectTrack}
          onStartRace={handleStartRace}
          onNavigate={(targetState) => setGameState(targetState)}
          onBack={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      {/* 6. COUNTDOWN OVERLAY */}
      {gameState === GAME_STATES.COUNTDOWN && (
        <CountdownOverlay step={countdownStep} />
      )}

      {/* 7. IN-RACE HUD */}
      {['COUNTDOWN', 'RACING'].includes(gameState) && (
        <RaceHUD
          telemetry={telemetry}
          trackData={telemetry?.trackData}
          totalLaps={raceConfig?.laps || 3}
          onPause={() => setGameState(GAME_STATES.PAUSED)}
          onCameraChange={handleCameraChange}
          cameraMode={cameraMode}
        />
      )}

      {/* 8. PAUSE MENU */}
      {gameState === GAME_STATES.PAUSED && (
        <PauseMenu
          onResume={() => setGameState(GAME_STATES.RACING)}
          onRestart={handleRestartRace}
          onOpenSettings={() => setShowSettings(true)}
          onQuit={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      {/* 9. RACE RESULTS */}
      {gameState === GAME_STATES.FINISHED && (
        <RaceResults
          results={raceResults}
          onNextRace={handleNextRace}
          onReplay={handleRestartRace}
          onGarage={() => setGameState(GAME_STATES.GARAGE)}
          onMainMenu={() => setGameState(GAME_STATES.MENU)}
        />
      )}

      {/* 10. SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* DEVELOPER CREDIT BADGE ON ALL MENU INTERFACES */}
      {[GAME_STATES.MENU, GAME_STATES.GARAGE, GAME_STATES.CAR_SELECT, GAME_STATES.TRACK_SELECT].includes(gameState) && (
        <div className="menu-author-credit">
          <span className="credit-lead">Developed by</span>
          <span className="credit-author">Gaurav Gautam</span>
        </div>
      )}
    </div>
  );
}
