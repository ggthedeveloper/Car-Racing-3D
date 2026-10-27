import React from 'react';
import { Minimap } from '../game/Minimap';
import { formatTime } from '../../utils/math';

export function RaceHUD({
  telemetry,
  trackData,
  totalLaps = 3,
  onPause,
  onCameraChange,
  cameraMode
}) {
  const {
    speedKmh = 0,
    rpm = 900,
    redlineRpm = 8000,
    gear = 1,
    nitro = 100,
    nitroTier = 0,
    isPerfectNitroReady = false,
    isDrafting = false,
    currentSurface = 'Asphalt',
    damage = 0,
    position = 1,
    totalRacers = 8,
    currentLap = 1,
    currentLapTime = 0,
    bestLapTime = 0,
    totalRaceTime = 0,
    isDrifting = false,
    driftAngle = 0,
    driftScore = 0,
    driftMultiplier = 1.0,
    isWrongWay = false,
    playerPos = null,
    playerYaw = 0,
    aiPositions = [],
    trafficPositions = []
  } = telemetry || {};

  // RPM percentage for radial gauge
  const rpmPercent = Math.min(100, Math.max(0, (rpm / redlineRpm) * 100));
  const isRedline = rpm > redlineRpm * 0.92;

  // Gear formatting
  const gearText = gear === -1 ? 'R' : gear === 0 ? 'N' : gear;

  // Svg arc calculation for RPM gauge
  const radius = 68;
  const circumference = Math.PI * radius; // 180 degree semi-circle
  const strokeDashoffset = circumference - (rpmPercent / 100) * circumference;

  return (
    <div className="race-hud">
      {/* WRONG WAY ALERT */}
      {isWrongWay && (
        <div className="wrong-way-banner">
          <span>&#9888; WRONG WAY &#9888;</span>
        </div>
      )}

      {/* TOP HEADER: POS, LAP, TIMING */}
      <div className="hud-top-bar">
        {/* Position */}
        <div className="hud-panel pos-panel">
          <div className="hud-label">POSITION</div>
          <div className="hud-value pos-value">
            <span className="pos-big">{position}</span>
            <span className="pos-total">/ {totalRacers}</span>
          </div>
        </div>

        {/* Lap */}
        <div className="hud-panel lap-panel">
          <div className="hud-label">LAP</div>
          <div className="hud-value">
            <span className="lap-big">{Math.min(currentLap, totalLaps)}</span>
            <span className="pos-total">/ {totalLaps}</span>
          </div>
        </div>

        {/* Race Time & Best Lap */}
        <div className="hud-panel time-panel">
          <div className="time-row">
            <span className="time-label">TIME</span>
            <span className="time-val">{formatTime(totalRaceTime)}</span>
          </div>
          <div className="time-row">
            <span className="time-label">LAP</span>
            <span className="time-val current-lap-val">{formatTime(currentLapTime)}</span>
          </div>
          <div className="time-row">
            <span className="time-label">BEST</span>
            <span className="time-val best-lap-val">{formatTime(bestLapTime)}</span>
          </div>
        </div>

        {/* Action Controls (Camera & Pause) */}
        <div className="hud-actions">
          <button className="hud-btn" onClick={onCameraChange} title="Change Camera (C)">
            &#128247; {cameraMode}
          </button>
          <button className="hud-btn" onClick={onPause} title="Pause Race (Esc)">
            &#10074;&#10074;
          </button>
        </div>
      </div>

      {/* Quick Controls Pill */}
      <div className="hud-controls-pill">
        <span>[W/A/S/D] Drive</span>
        <span>&bull;</span>
        <span>[SHIFT] Nitro</span>
        <span>&bull;</span>
        <span>[SPACE] Drift</span>
        <span>&bull;</span>
        <span>[C] Cam</span>
        <span>&bull;</span>
        <span>[R] Reset</span>
      </div>

      {/* SLIPSTREAM DRAFTING BADGE */}
      {isDrafting && (
        <div className="drafting-badge animate-pulse">
          <span className="draft-chevron">&#187;&#187;</span>
          <span>SLIPSTREAM DRAFTING +BOOST</span>
          <span className="draft-chevron">&#171;&#171;</span>
        </div>
      )}

      {/* DRIFT TELEMETRY CARD */}
      {isDrifting && (
        <div className="drift-badge animate-pop">
          <div className="drift-title">DRIFT</div>
          <div className="drift-stats">
            <div>ANGLE: <strong>{Math.round(driftAngle)}&deg;</strong></div>
            <div>SPEED: <strong>{Math.round(speedKmh)} KM/H</strong></div>
            <div className="drift-pts">+{Math.round(driftScore)} pts <span className="drift-mult">x{driftMultiplier.toFixed(1)}</span></div>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: MINIMAP, SURFACE BADGE & DAMAGE */}
      <div className="hud-bottom-left">
        {currentSurface && currentSurface !== 'Asphalt' && (
          <div className="surface-badge">
            <span className="surface-dot" />
            <span className="surface-name">{currentSurface.toUpperCase()}</span>
          </div>
        )}

        <Minimap
          trackData={trackData}
          playerPos={playerPos}
          playerYaw={playerYaw}
          aiPositions={aiPositions}
          trafficPositions={trafficPositions}
        />

        {/* Damage Indicator */}
        <div className="hud-panel damage-panel">
          <div className="damage-header">
            <span>DAMAGE</span>
            <span>{Math.round(damage)}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill damage-fill ${damage > 60 ? 'critical' : damage > 30 ? 'warning' : ''}`}
              style={{ width: `${damage}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: SPEEDOMETER, TACHOMETER, GEAR & NITRO */}
      <div className="hud-bottom-right">
        {/* Nitro Meter */}
        <div className={`hud-panel nitro-panel ${nitroTier === 2 ? 'perfect-nitro-active' : ''} ${isPerfectNitroReady ? 'perfect-nitro-ready' : ''}`}>
          <div className="nitro-header">
            <span className="nitro-status-title">
              {nitroTier === 2 ? (
                <span className="nitro-t2-glow">&#9733; PERFECT NITRO &#9733;</span>
              ) : nitroTier === 1 ? (
                <span className="nitro-t1-glow">NITRO BOOST</span>
              ) : isPerfectNitroReady ? (
                <span className="nitro-cue-glow">&#9654; HIT [SHIFT] FOR PERFECT NITRO! &#9664;</span>
              ) : (
                <span>NITRO [SHIFT]</span>
              )}
            </span>
            <span className="nitro-pct">{Math.round(nitro)}%</span>
          </div>
          <div className="progress-track nitro-track">
            <div
              className={`progress-fill nitro-fill ${nitroTier === 2 ? 'tier-2' : nitroTier === 1 ? 'tier-1' : nitro > 20 ? 'active' : ''}`}
              style={{ width: `${nitro}%` }}
            />
          </div>
        </div>

        {/* Digital Speedometer & Radial RPM */}
        <div className="cluster-container">
          <svg className="rpm-gauge" viewBox="0 0 160 90">
            {/* Background Arc */}
            <path
              d="M 12 80 A 68 68 0 0 1 148 80"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Active RPM Arc */}
            <path
              d="M 12 80 A 68 68 0 0 1 148 80"
              fill="none"
              stroke={isRedline ? '#ef4444' : rpmPercent > 70 ? '#f59e0b' : '#00e5ff'}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="rpm-path"
            />
          </svg>

          <div className="speed-cluster">
            <div className="gear-indicator">{gearText}</div>
            <div className="speed-digit">{Math.round(speedKmh)}</div>
            <div className="speed-unit">KM/H</div>
            <div className="rpm-text">{Math.round(rpm)} RPM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
