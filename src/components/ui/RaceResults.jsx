import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { formatTime, formatCurrency } from '../../utils/math';
import { audioManager } from '../../audio/AudioManager';
import { REWARDS } from '../../utils/constants';

export function RaceResults({
  results,
  onNextRace,
  onReplay,
  onGarage,
  onMainMenu
}) {
  const {
    position = 1,
    totalTime = 0,
    bestLap = 0,
    driftScore = 0,
    damage = 0
  } = results || {};

  const isPodium = position <= 3;
  const posOrdinal = position === 1 ? '1st' : position === 2 ? '2nd' : position === 3 ? '3rd' : `${position}th`;

  const posCredits = REWARDS.POSITION[position - 1] || 150;
  const driftCredits = Math.round(driftScore * REWARDS.DRIFT_FACTOR);
  const cleanBonus = damage < 15 ? REWARDS.CLEAN_RACE : 0;
  const totalCredits = posCredits + driftCredits + cleanBonus;
  const xpEarned = REWARDS.XP_POSITION[position - 1] || 100;

  useEffect(() => {
    audioManager.playFinishFanfare();
    if (isPodium) {
      // Fire celebration confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [isPodium]);

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="modal-backdrop results-overlay">
      <div className="results-panel">
        <div className="finish-banner">
          <h2>CHECKERED FLAG &mdash; FINISH!</h2>
        </div>

        {/* PODIUM POSITION */}
        <div className={`position-badge ${isPodium ? 'podium' : ''}`}>
          <div className="badge-sub">FINISH POSITION</div>
          <div className="badge-main">{posOrdinal}</div>
          {position === 1 && <div className="winner-tag">&#127942; GRAND PRIX WINNER</div>}
        </div>

        {/* STATS MATRIX */}
        <div className="results-matrix">
          <div className="r-stat-box">
            <span className="r-label">TOTAL TIME</span>
            <span className="r-val">{formatTime(totalTime)}</span>
          </div>
          <div className="r-stat-box">
            <span className="r-label">BEST LAP</span>
            <span className="r-val">{formatTime(bestLap)}</span>
          </div>
          <div className="r-stat-box">
            <span className="r-label">DRIFT SCORE</span>
            <span className="r-val drift-val">{formatCurrency(driftScore)} PTS</span>
          </div>
        </div>

        {/* REWARDS BREAKDOWN */}
        <div className="rewards-breakdown">
          <div className="rewards-title">REWARDS EARNED</div>
          <div className="rew-row">
            <span>Position Prize ({posOrdinal})</span>
            <strong>+{formatCurrency(posCredits)} CR</strong>
          </div>
          {driftCredits > 0 && (
            <div className="rew-row">
              <span>Drift Performance Bonus</span>
              <strong>+{formatCurrency(driftCredits)} CR</strong>
            </div>
          )}
          {cleanBonus > 0 && (
            <div className="rew-row clean-bonus">
              <span>Clean Driving Bonus (Minimal Damage)</span>
              <strong>+{formatCurrency(cleanBonus)} CR</strong>
            </div>
          )}
          <div className="rew-total">
            <span>TOTAL CREDITS</span>
            <span className="total-gold">+{formatCurrency(totalCredits)} CR</span>
          </div>
          <div className="rew-total xp-total">
            <span>XP EARNED</span>
            <span className="total-xp">+{formatCurrency(xpEarned)} XP</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="results-actions">
          <button className="menu-btn primary-play-btn" onClick={() => handleAction(onNextRace)}>
            NEXT RACE &rarr;
          </button>
          <button className="menu-btn" onClick={() => handleAction(onReplay)}>
            &#8634; REPLAY
          </button>
          <button className="menu-btn" onClick={() => handleAction(onGarage)}>
            &#128295; GARAGE
          </button>
          <button className="menu-btn secondary-btn" onClick={() => handleAction(onMainMenu)}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
