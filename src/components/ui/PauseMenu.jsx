import React, { useState } from 'react';
import { audioManager } from '../../audio/AudioManager';

export function PauseMenu({
  onResume,
  onRestart,
  onOpenSettings,
  onQuit
}) {
  const [showControls, setShowControls] = useState(false);

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="modal-backdrop pause-overlay">
      <div className="pause-panel">
        <h2 className="pause-title">GAME PAUSED</h2>

        {!showControls ? (
          <div className="pause-actions">
            <button className="menu-btn primary-play-btn" onClick={() => handleAction(onResume)}>
              &#9654; RESUME RACE
            </button>
            <button className="menu-btn" onClick={() => handleAction(onRestart)}>
              &#8634; RESTART RACE
            </button>
            <button className="menu-btn" onClick={() => handleAction(onOpenSettings)}>
              &#9881; SETTINGS
            </button>
            <button className="menu-btn" onClick={() => handleAction(() => setShowControls(true))}>
              &#127918; CONTROLS GUIDE
            </button>
            <button className="menu-btn danger-btn" onClick={() => handleAction(onQuit)}>
              &#10006; QUIT TO MENU
            </button>
          </div>
        ) : (
          <div className="controls-guide-panel">
            <h3>CONTROLS</h3>
            <div className="controls-list">
              <div className="c-row"><span>Accelerate</span><strong>W / Up Arrow</strong></div>
              <div className="c-row"><span>Brake / Reverse</span><strong>S / Down Arrow</strong></div>
              <div className="c-row"><span>Steer Left / Right</span><strong>A / D or Left / Right</strong></div>
              <div className="c-row"><span>Handbrake (Drift)</span><strong>Spacebar</strong></div>
              <div className="c-row"><span>Nitro Boost</span><strong>Shift</strong></div>
              <div className="c-row"><span>Change Camera</span><strong>C Key</strong></div>
              <div className="c-row"><span>Reset Car</span><strong>R Key</strong></div>
              <div className="c-row"><span>Pause</span><strong>Escape</strong></div>
            </div>
            <button className="menu-btn" onClick={() => handleAction(() => setShowControls(false))}>
              BACK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
