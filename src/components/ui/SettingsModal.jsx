import React, { useState } from 'react';
import { audioManager } from '../../audio/AudioManager';

export function SettingsModal({
  settings,
  onUpdateSettings,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('graphics');

  const { graphics = {}, audio = {}, controls = {}, gameplay = {} } = settings;

  const handleAudioChange = (key, val) => {
    const newAudio = { ...audio, [key]: parseFloat(val) };
    onUpdateSettings({ audio: newAudio });
    audioManager.setVolumes(newAudio);
  };

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="modal-backdrop settings-overlay" onClick={onClose}>
      <div className="modal-card settings-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="settings-header">
          <h2>GAME SETTINGS</h2>
          <button className="close-btn" onClick={() => handleAction(onClose)}>
            &times;
          </button>
        </div>

        {/* TABS */}
        <div className="settings-tabs">
          <button
            className={`s-tab-btn ${activeTab === 'graphics' ? 'active' : ''}`}
            onClick={() => handleAction(() => setActiveTab('graphics'))}
          >
            GRAPHICS
          </button>
          <button
            className={`s-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => handleAction(() => setActiveTab('audio'))}
          >
            AUDIO
          </button>
          <button
            className={`s-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => handleAction(() => setActiveTab('controls'))}
          >
            CONTROLS
          </button>
          <button
            className={`s-tab-btn ${activeTab === 'gameplay' ? 'active' : ''}`}
            onClick={() => handleAction(() => setActiveTab('gameplay'))}
          >
            GAMEPLAY
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="settings-body">
          {/* 1. GRAPHICS */}
          {activeTab === 'graphics' && (
            <div className="settings-group">
              <div className="setting-item">
                <span className="s-label">Visual Quality Preset</span>
                <div className="options-row">
                  {['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].map((q) => (
                    <button
                      key={q}
                      className={`option-chip ${graphics.quality === q ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ graphics: { ...graphics, quality: q } })}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item toggle-item">
                <span className="s-label">Dynamic Shadows</span>
                <input
                  type="checkbox"
                  checked={graphics.shadows}
                  onChange={(e) => onUpdateSettings({ graphics: { ...graphics, shadows: e.target.checked } })}
                />
              </div>

              <div className="setting-item toggle-item">
                <span className="s-label">Anti-Aliasing (Smooth Edges)</span>
                <input
                  type="checkbox"
                  checked={graphics.antialiasing}
                  onChange={(e) => onUpdateSettings({ graphics: { ...graphics, antialiasing: e.target.checked } })}
                />
              </div>

              <div className="setting-item toggle-item">
                <span className="s-label">Particle &amp; Weather Effects</span>
                <input
                  type="checkbox"
                  checked={graphics.effects}
                  onChange={(e) => onUpdateSettings({ graphics: { ...graphics, effects: e.target.checked } })}
                />
              </div>

              <div className="setting-item toggle-item">
                <span className="s-label">Show FPS Counter</span>
                <input
                  type="checkbox"
                  checked={graphics.showFps}
                  onChange={(e) => onUpdateSettings({ graphics: { ...graphics, showFps: e.target.checked } })}
                />
              </div>
            </div>
          )}

          {/* 2. AUDIO */}
          {activeTab === 'audio' && (
            <div className="settings-group">
              <div className="setting-item slider-item">
                <div className="slider-header">
                  <span>Master Volume</span>
                  <span>{Math.round(audio.master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.master}
                  onChange={(e) => handleAudioChange('master', e.target.value)}
                />
              </div>

              <div className="setting-item slider-item">
                <div className="slider-header">
                  <span>Music Volume</span>
                  <span>{Math.round(audio.music * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.music}
                  onChange={(e) => handleAudioChange('music', e.target.value)}
                />
              </div>

              <div className="setting-item slider-item">
                <div className="slider-header">
                  <span>Engine Volume</span>
                  <span>{Math.round(audio.engine * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.engine}
                  onChange={(e) => handleAudioChange('engine', e.target.value)}
                />
              </div>

              <div className="setting-item slider-item">
                <div className="slider-header">
                  <span>Sound Effects (Tires, Collisions, Nitro)</span>
                  <span>{Math.round(audio.sfx * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.sfx}
                  onChange={(e) => handleAudioChange('sfx', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 3. CONTROLS */}
          {activeTab === 'controls' && (
            <div className="settings-group">
              <div className="setting-item toggle-item">
                <span className="s-label">Enable Mouse Steering</span>
                <input
                  type="checkbox"
                  checked={controls.mouseSteering}
                  onChange={(e) => onUpdateSettings({ controls: { ...controls, mouseSteering: e.target.checked } })}
                />
              </div>

              <div className="key-bindings-box">
                <div className="s-label">Default Keyboard Bindings</div>
                <div className="key-grid">
                  <div className="k-row"><span>Throttle</span><kbd>W / &uarr;</kbd></div>
                  <div className="k-row"><span>Brake / Reverse</span><kbd>S / &darr;</kbd></div>
                  <div className="k-row"><span>Steering</span><kbd>A / D or &larr; / &rarr;</kbd></div>
                  <div className="k-row"><span>Handbrake (Drift)</span><kbd>Space</kbd></div>
                  <div className="k-row"><span>Nitro NOS</span><kbd>Shift</kbd></div>
                  <div className="k-row"><span>Change Camera</span><kbd>C</kbd></div>
                  <div className="k-row"><span>Reset Car</span><kbd>R</kbd></div>
                  <div className="k-row"><span>Pause</span><kbd>Esc</kbd></div>
                </div>
              </div>

              <div className="gamepad-status-note">
                &#127918; Gamepad controller support is automatically active when a gamepad is connected.
              </div>
            </div>
          )}

          {/* 4. GAMEPLAY */}
          {activeTab === 'gameplay' && (
            <div className="settings-group">
              <div className="setting-item">
                <span className="s-label">AI Difficulty</span>
                <div className="options-row">
                  {['EASY', 'NORMAL', 'HARD', 'EXPERT'].map((d) => (
                    <button
                      key={d}
                      className={`option-chip ${gameplay.difficulty === d ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ gameplay: { ...gameplay, difficulty: d } })}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item slider-item">
                <div className="slider-header">
                  <span>Steering Sensitivity</span>
                  <span>{(gameplay.steeringSensitivity || 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={gameplay.steeringSensitivity || 1.0}
                  onChange={(e) => onUpdateSettings({ gameplay: { ...gameplay, steeringSensitivity: parseFloat(e.target.value) } })}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="settings-footer">
          <button className="menu-btn primary-play-btn" onClick={() => handleAction(onClose)}>
            SAVE &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
