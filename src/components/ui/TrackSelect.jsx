import React, { useState } from 'react';
import { TRACK_DEFINITIONS } from '../../tracks/TrackDefinitions';
import { CAR_DEFINITIONS } from '../../vehicles/CarDefinitions';
import { TIME_OF_DAY, WEATHER_MODES, DIFFICULTY } from '../../utils/constants';
import { audioManager } from '../../audio/AudioManager';

export function TrackSelect({
  selectedTrackId,
  selectedCarId,
  onSelectTrack,
  onStartRace,
  onNavigate,
  onBack
}) {
  const currentTrack = TRACK_DEFINITIONS.find((t) => t.id === selectedTrackId) || TRACK_DEFINITIONS[0];
  const activeCar = CAR_DEFINITIONS.find((c) => c.id === selectedCarId) || CAR_DEFINITIONS[0];

  const [timeOfDay, setTimeOfDay] = useState(currentTrack.defaultTime || 'DAY');
  const [weather, setWeather] = useState(currentTrack.defaultWeather || 'CLEAR');
  const [difficulty, setDifficulty] = useState('NORMAL');
  const [laps, setLaps] = useState(currentTrack.defaultLaps || 3);

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="menu-overlay track-select-screen">
      {/* HEADER */}
      <div className="menu-top-bar">
        <button className="menu-btn back-btn" onClick={() => handleAction(onBack)}>
          &larr; BACK
        </button>
        <div className="garage-title-tag">
          <h2>SELECT GRAND PRIX CIRCUIT</h2>
        </div>
        {onNavigate ? (
          <button
            className="player-stat-badge"
            style={{ cursor: 'pointer', border: '1px solid var(--border-cyan)' }}
            onClick={() => handleAction(() => onNavigate('CAR_SELECT'))}
          >
            <span className="stat-icon">&#128663;</span>
            <span className="stat-label">{activeCar.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--cyan-glow)' }}>[CHANGE]</span>
          </button>
        ) : (
          <div style={{ width: 100 }} />
        )}
      </div>

      <div className="track-layout-grid">
        {/* LEFT COLUMN: TRACK CARDS */}
        <div className="track-list-col">
          {TRACK_DEFINITIONS.map((track) => {
            const isSelected = track.id === selectedTrackId;
            return (
              <div
                key={track.id}
                className={`track-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  handleAction(() => {
                    onSelectTrack(track.id);
                    setTimeOfDay(track.defaultTime || 'DAY');
                    setWeather(track.defaultWeather || 'CLEAR');
                    setLaps(track.defaultLaps || 3);
                  });
                }}
              >
                <div className="track-card-header">
                  <span className="track-diff-badge">{track.difficulty}</span>
                  <span className="track-km">{track.lengthKm} KM</span>
                </div>
                <h3 className="track-card-title">{track.name}</h3>
                <p className="track-card-tagline">{track.tagline}</p>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: TRACK DETAILS & RACE MODIFIERS */}
        <div className="track-details-col">
          <div className="track-info-banner">
            <span className="track-theme-tag">{currentTrack.theme.toUpperCase()}</span>
            <h2 className="track-info-title">{currentTrack.name}</h2>
            <p className="track-info-desc">{currentTrack.description}</p>
          </div>

          {/* RACE MODIFIERS */}
          <div className="modifiers-container">
            {/* Time of Day */}
            <div className="mod-group">
              <div className="mod-label">TIME OF DAY</div>
              <div className="options-row">
                {Object.values(TIME_OF_DAY).map((tod) => (
                  <button
                    key={tod}
                    className={`option-chip ${timeOfDay === tod ? 'active' : ''}`}
                    onClick={() => handleAction(() => setTimeOfDay(tod))}
                  >
                    {tod}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div className="mod-group">
              <div className="mod-label">WEATHER CONDITIONS</div>
              <div className="options-row">
                {Object.values(WEATHER_MODES).map((wm) => (
                  <button
                    key={wm}
                    className={`option-chip ${weather === wm ? 'active' : ''}`}
                    onClick={() => handleAction(() => setWeather(wm))}
                  >
                    {wm}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Difficulty */}
            <div className="mod-group">
              <div className="mod-label">AI OPPONENTS DIFFICULTY</div>
              <div className="options-row">
                {Object.values(DIFFICULTY).map((diff) => (
                  <button
                    key={diff}
                    className={`option-chip ${difficulty === diff ? 'active' : ''}`}
                    onClick={() => handleAction(() => setDifficulty(diff))}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Lap Count */}
            <div className="mod-group">
              <div className="mod-label">RACE DISTANCE (LAPS)</div>
              <div className="options-row">
                {[1, 2, 3, 5].map((l) => (
                  <button
                    key={l}
                    className={`option-chip ${laps === l ? 'active' : ''}`}
                    onClick={() => handleAction(() => setLaps(l))}
                  >
                    {l} {l === 1 ? 'LAP' : 'LAPS'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* START BUTTON */}
          <button
            className="start-race-action-btn"
            onClick={() => {
              handleAction(() => {
                onStartRace({
                  trackId: selectedTrackId,
                  timeOfDay,
                  weather,
                  difficulty,
                  laps
                });
              });
            }}
          >
            <span className="btn-glow" />
            <span className="start-btn-text">&#9654; START GRAND PRIX</span>
          </button>
        </div>
      </div>
    </div>
  );
}
