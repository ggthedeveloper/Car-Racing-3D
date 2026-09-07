import React, { useEffect, useState } from 'react';

const LOADING_STAGES = [
  'Loading 3D track environment & shaders…',
  'Constructing high-fidelity car chassis…',
  'Initializing audio synthesis engine…',
  'Configuring Pacejka vehicle dynamics…',
  'Spawning grid opponents & AI racing lines…',
  'Finalizing starting grid…'
];

export function LoadingScreen({ onLoaded }) {
  const [progress, setProgress] = useState(10);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onLoaded, 300);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 15 + 10);
        const stage = Math.min(
          LOADING_STAGES.length - 1,
          Math.floor((next / 100) * LOADING_STAGES.length)
        );
        setStageIndex(stage);
        return Math.min(100, next);
      });
    }, 140);

    return () => clearInterval(interval);
  }, [onLoaded]);

  return (
    <div className="loading-screen-overlay">
      <div className="loading-content">
        <h1 className="loading-title">
          <span className="title-turbo">TURBO</span> <span className="title-rush">RUSH</span>
          <div className="loading-subtitle">3D RACING</div>
        </h1>

        <div className="loading-stage-text">
          {LOADING_STAGES[stageIndex]}
        </div>

        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="loading-percentage">{progress}%</div>

        <div className="loading-tip">
          <strong>PRO TIP:</strong> Tap <em>SPACEBAR</em> before entering a tight corner to initiate high-speed power drifts!
        </div>
      </div>
    </div>
  );
}
