import React, { useState } from 'react';
import { CAR_DEFINITIONS, PAINT_PALETTE, PAINT_FINISHES, RIM_STYLES } from '../../vehicles/CarDefinitions';
import { UPGRADE_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/math';
import { audioManager } from '../../audio/AudioManager';

export function Garage({
  userData,
  onSelectCar,
  onBuyCar,
  onCustomizeCar,
  onUpgradeCar,
  onBack
}) {
  const [activeTab, setActiveTab] = useState('upgrades'); // 'upgrades' | 'customize' | 'cars'

  const currentCarId = userData.selectedCarId || 'street-gt';
  const currentCar = CAR_DEFINITIONS.find((c) => c.id === currentCarId) || CAR_DEFINITIONS[0];
  const custom = userData.carCustomizations[currentCarId] || {};
  const carUpgrades = userData.carUpgrades[currentCarId] || {};

  const handleAction = (cb) => {
    audioManager.init();
    audioManager.resume();
    audioManager.playClick();
    cb();
  };

  return (
    <div className="menu-overlay garage-screen">
      {/* TOP HEADER */}
      <div className="menu-top-bar">
        <button className="menu-btn back-btn" onClick={() => handleAction(onBack)}>
          &larr; MAIN MENU
        </button>

        <div className="garage-title-tag">
          <h2>GARAGE &amp; TUNING WORKSHOP</h2>
        </div>

        <div className="player-stat-badge credits-badge">
          <span className="stat-icon">&#128176;</span>
          <span className="stat-value">{formatCurrency(userData.credits || 0)} CR</span>
        </div>
      </div>

      <div className="garage-main-layout">
        {/* LEFT PANEL: CAR SPECS & VEHICLE SELECTOR */}
        <div className="garage-panel left-panel">
          <div className="car-header-badge">
            <span className="car-class-tag">{currentCar.class}</span>
            <h3 className="car-name-big">{currentCar.name}</h3>
            <p className="car-tagline">{currentCar.tagline}</p>
          </div>

          {/* SPEC BARS */}
          <div className="car-spec-list">
            <div className="spec-row">
              <span className="spec-label">TOP SPEED</span>
              <div className="spec-bar-track">
                <div className="spec-bar-fill" style={{ width: `${currentCar.stats.speed}%` }} />
              </div>
              <span className="spec-num">{currentCar.physics.topSpeedKmh} KM/H</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">ACCELERATION</span>
              <div className="spec-bar-track">
                <div className="spec-bar-fill" style={{ width: `${currentCar.stats.acceleration}%` }} />
              </div>
              <span className="spec-num">{currentCar.stats.acceleration}</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">HANDLING</span>
              <div className="spec-bar-track">
                <div className="spec-bar-fill" style={{ width: `${currentCar.stats.handling}%` }} />
              </div>
              <span className="spec-num">{currentCar.stats.handling}</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">BRAKING</span>
              <div className="spec-bar-track">
                <div className="spec-bar-fill" style={{ width: `${currentCar.stats.braking}%` }} />
              </div>
              <span className="spec-num">{currentCar.stats.braking}</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">DRIFT RATING</span>
              <div className="spec-bar-track">
                <div className="spec-bar-fill drift-fill" style={{ width: `${currentCar.stats.drift}%` }} />
              </div>
              <span className="spec-num">{currentCar.stats.drift}</span>
            </div>
          </div>

          {/* VEHICLE QUICK SELECT */}
          <div className="car-quick-grid">
            <div className="panel-subhead">FLEET SHOWROOM</div>
            <div className="fleet-cards">
              {CAR_DEFINITIONS.map((car) => {
                const isUnlocked = userData.unlockedCars.includes(car.id);
                const isSelected = car.id === currentCarId;

                return (
                  <div
                    key={car.id}
                    className={`fleet-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => {
                      if (isUnlocked) {
                        handleAction(() => onSelectCar(car.id));
                      }
                    }}
                  >
                    <div className="fleet-card-name">{car.name}</div>
                    <div className="fleet-card-sub">{car.class}</div>
                    {!isUnlocked && (
                      <button
                        className="fleet-buy-btn"
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
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: TUNING & CUSTOMIZATION TABS */}
        <div className="garage-panel right-panel">
          {/* TAB HEADERS */}
          <div className="garage-tab-bar">
            <button
              className={`garage-tab-btn ${activeTab === 'upgrades' ? 'active' : ''}`}
              onClick={() => handleAction(() => setActiveTab('upgrades'))}
            >
              &#9889; PERFORMANCE TUNING
            </button>
            <button
              className={`garage-tab-btn ${activeTab === 'customize' ? 'active' : ''}`}
              onClick={() => handleAction(() => setActiveTab('customize'))}
            >
              &#127912; VISUAL CUSTOMIZATION
            </button>
          </div>

          {/* TAB 1: UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="tuning-list">
              {Object.entries(UPGRADE_TYPES).map(([key, upDef]) => {
                const catId = upDef.id;
                const currentLevel = carUpgrades[catId] || 0;
                const isMax = currentLevel >= upDef.maxLevel;
                const nextCost = !isMax ? upDef.costs[currentLevel] : null;
                const canAfford = nextCost !== null && userData.credits >= nextCost;

                return (
                  <div key={catId} className="upgrade-card">
                    <div className="upgrade-info">
                      <div className="upgrade-name">{upDef.name}</div>
                      <div className="upgrade-desc">{upDef.description}</div>
                      {/* Level Pips */}
                      <div className="stage-pips">
                        {[1, 2, 3].map((lvl) => (
                          <span
                            key={lvl}
                            className={`stage-pip ${lvl <= currentLevel ? 'filled' : ''}`}
                          >
                            STAGE {lvl}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="upgrade-action">
                      {isMax ? (
                        <div className="max-tag">MAX STAGE</div>
                      ) : (
                        <button
                          className={`upgrade-btn ${canAfford ? 'can-afford' : 'cant-afford'}`}
                          onClick={() => handleAction(() => onUpgradeCar(currentCarId, catId))}
                          disabled={!canAfford}
                        >
                          <span className="upgrade-cost">{formatCurrency(nextCost)} CR</span>
                          <span className="upgrade-label">INSTALL</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CUSTOMIZE */}
          {activeTab === 'customize' && (
            <div className="custom-options">
              {/* Paint Color */}
              <div className="custom-section">
                <div className="custom-label">CAR BODY PAINT COLOR</div>
                <div className="palette-grid">
                  {PAINT_PALETTE.map((p) => (
                    <button
                      key={p.hex}
                      className={`color-swatch ${(custom.paintColor || currentCar.visuals.defaultColor) === p.hex ? 'active' : ''}`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                      onClick={() => handleAction(() => onCustomizeCar(currentCarId, { paintColor: p.hex }))}
                    />
                  ))}
                </div>
              </div>

              {/* Paint Finish */}
              <div className="custom-section">
                <div className="custom-label">PAINT FINISH / CLEARCOAT</div>
                <div className="options-row">
                  {PAINT_FINISHES.map((f) => (
                    <button
                      key={f.id}
                      className={`option-chip ${(custom.finish || 'metallic') === f.id ? 'active' : ''}`}
                      onClick={() => handleAction(() => onCustomizeCar(currentCarId, { finish: f.id }))}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spoilers */}
              <div className="custom-section">
                <div className="custom-label">REAR SPOILER / AERO WING</div>
                <div className="options-row">
                  {['none', 'ducktail', 'sport_wing', 'gt_wing', 'carbon_super_wing'].map((sp) => (
                    <button
                      key={sp}
                      className={`option-chip ${(custom.spoiler || 'sport_wing') === sp ? 'active' : ''}`}
                      onClick={() => handleAction(() => onCustomizeCar(currentCarId, { spoiler: sp }))}
                    >
                      {sp.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wheels / Rims */}
              <div className="custom-section">
                <div className="custom-label">ALLOY WHEEL RIM STYLE</div>
                <div className="options-row">
                  {RIM_STYLES.map((r) => (
                    <button
                      key={r.id}
                      className={`option-chip ${(custom.rimStyle || 'spoke5') === r.id ? 'active' : ''}`}
                      onClick={() => handleAction(() => onCustomizeCar(currentCarId, { rimStyle: r.id }))}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
