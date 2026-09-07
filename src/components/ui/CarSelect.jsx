import React from 'react';
import { CAR_DEFINITIONS } from '../../vehicles/CarDefinitions';
import { formatCurrency } from '../../utils/math';
import { audioManager } from '../../audio/AudioManager';

export function CarSelect({
  userData,
  onSelectCar,
  onBuyCar,
  onNavigate,
  onBack
}) {
  const currentCarId = userData.selectedCarId || 'street-gt';
  const selectedCar = CAR_DEFINITIONS.find((c) => c.id === currentCarId) || CAR_DEFINITIONS[0];

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="menu-overlay car-select-screen">
      {/* HEADER */}
      <div className="menu-top-bar">
        <button className="menu-btn back-btn" onClick={() => handleAction(onBack)}>
          &larr; MAIN MENU
        </button>

        <div className="garage-title-tag">
          <h2>SELECT YOUR VEHICLE</h2>
        </div>

        <div className="player-stat-badge credits-badge">
          <span className="stat-icon">&#128176;</span>
          <span className="stat-value">{formatCurrency(userData.credits || 0)} CR</span>
        </div>
      </div>

      <div className="car-select-layout">
        {/* CAR CARDS GRID */}
        <div className="car-cards-grid">
          {CAR_DEFINITIONS.map((car) => {
            const isUnlocked = userData.unlockedCars.includes(car.id);
            const isSelected = car.id === currentCarId;

            return (
              <div
                key={car.id}
                className={`car-card-item ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => {
                  if (isUnlocked) {
                    handleAction(() => onSelectCar(car.id));
                  }
                }}
              >
                <div className="car-card-top">
                  <span className="car-card-class">{car.class}</span>
                  {!isUnlocked && <span className="lock-icon">&#128274;</span>}
                </div>

                <h3 className="car-card-title">{car.name}</h3>
                <p className="car-card-desc">{car.tagline}</p>

                {/* MINI STAT BARS */}
                <div className="mini-stats">
                  <div className="m-stat">
                    <span>SPD</span>
                    <div className="m-bar"><div className="m-fill" style={{ width: `${car.stats.speed}%` }} /></div>
                  </div>
                  <div className="m-stat">
                    <span>ACC</span>
                    <div className="m-bar"><div className="m-fill" style={{ width: `${car.stats.acceleration}%` }} /></div>
                  </div>
                  <div className="m-stat">
                    <span>HND</span>
                    <div className="m-bar"><div className="m-fill" style={{ width: `${car.stats.handling}%` }} /></div>
                  </div>
                  <div className="m-stat">
                    <span>DFT</span>
                    <div className="m-bar"><div className="m-fill drift" style={{ width: `${car.stats.drift}%` }} /></div>
                  </div>
                </div>

                {/* BOTTOM ACTION */}
                <div className="car-card-bottom">
                  {isUnlocked ? (
                    <button
                      className={`car-select-btn ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(() => onSelectCar(car.id));
                      }}
                    >
                      {isSelected ? 'EQUIPPED' : 'DRIVE'}
                    </button>
                  ) : (
                    <button
                      className="car-buy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(() => onBuyCar(car));
                      }}
                      disabled={userData.credits < car.price}
                    >
                      BUY {formatCurrency(car.price)} CR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="car-select-actions">
          <button
            className="menu-btn secondary-btn"
            onClick={() => handleAction(() => onNavigate('GARAGE'))}
          >
            &#128295; TUNE IN GARAGE
          </button>
          <button
            className="menu-btn primary-play-btn"
            onClick={() => handleAction(() => onNavigate('TRACK_SELECT'))}
          >
            &#9654; NEXT: SELECT TRACK
          </button>
        </div>
      </div>
    </div>
  );
}
