import React, { useState } from 'react';
import { audioManager } from '../../audio/AudioManager';
import { formatCurrency } from '../../utils/math';

export function MainMenu({
  userData,
  onNavigate,
  onOpenSettings
}) {
  const [showCredits, setShowCredits] = useState(false);

  const handleButtonClick = (action) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    action();
  };

  return (
    <div className="menu-overlay main-menu-screen">
      {/* TOP HEADER: PLAYER CREDITS & LEVEL */}
      <div className="menu-top-bar">
        <div className="player-stat-badge">
          <span className="stat-icon">&#11088;</span>
          <span className="stat-label">LVL {userData.level || 1}</span>
          <div className="xp-mini-bar">
            <div
              className="xp-mini-fill"
              style={{ width: `${((userData.xp || 0) % 1000) / 10}%` }}
            />
          </div>
        </div>

        <div className="player-stat-badge credits-badge">
          <span className="stat-icon">&#128176;</span>
          <span className="stat-value">{formatCurrency(userData.credits || 0)} CR</span>
        </div>
      </div>

      {/* MAIN LOGO & HERO */}
      <div className="main-hero">
        <div className="hero-sub">NEXT-GEN ARCADE SIMULATION</div>
        <h1 className="hero-title">
          <span className="title-turbo">TURBO</span> <span className="title-rush">RUSH</span>
          <div className="title-3d">3D RACING</div>
        </h1>
        <div className="hero-divider" />
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="menu-nav-list">
        <button
          className="menu-nav-btn primary-play-btn"
          onClick={() => handleButtonClick(() => onNavigate('TRACK_SELECT'))}
        >
          <span className="btn-glow" />
          <span className="btn-text">&#9654; PLAY RACE</span>
        </button>

        <button
          className="menu-nav-btn"
          onClick={() => handleButtonClick(() => onNavigate('GARAGE'))}
        >
          <span className="btn-text">&#128295; GARAGE &amp; UPGRADES</span>
        </button>

        <button
          className="menu-nav-btn"
          onClick={() => handleButtonClick(() => onNavigate('CAR_SELECT'))}
        >
          <span className="btn-text">&#128663; SELECT CAR</span>
        </button>

        <button
          className="menu-nav-btn"
          onClick={() => handleButtonClick(onOpenSettings)}
        >
          <span className="btn-text">&#9881; SETTINGS</span>
        </button>

        <button
          className="menu-nav-btn"
          onClick={() => handleButtonClick(() => setShowCredits(true))}
        >
          <span className="btn-text">&#9432; CREDITS</span>
        </button>
      </div>

      {/* FOOTER HINTS */}
      <div className="menu-footer">
        <span>Use <strong>W/A/S/D</strong> or <strong>Arrows</strong> to drive &bull; <strong>Space</strong> Handbrake &bull; <strong>Shift</strong> Nitro &bull; <strong>C</strong> Camera</span>
      </div>

      {/* CREDITS MODAL */}
      {showCredits && (
        <div className="modal-backdrop" onClick={() => setShowCredits(false)}>
          <div className="modal-card credits-card" onClick={(e) => e.stopPropagation()}>
            <h2>TURBO RUSH 3D</h2>
            <p className="credits-desc">
              High-performance realistic 3D web racing game engine built with React, Three.js, procedural PBR shaders, dynamic Pacejka vehicle dynamics, intelligent spline AI, and procedural Web Audio synthesis.
            </p>
            <div className="credits-list">
              <div><strong>Core Systems:</strong> React &bull; Three.js &bull; WebGL &bull; Web Audio API</div>
              <div><strong>Vehicle Physics:</strong> Independent Raycast Springs, Pacejka Slip, Drift Mechanics</div>
              <div><strong>Environment:</strong> Procedural Shaders, Dynamic Weather &amp; Time of Day</div>
            </div>
            <button className="menu-btn modal-close-btn" onClick={() => setShowCredits(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
