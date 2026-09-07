import React from 'react';

export function CountdownOverlay({ step }) {
  if (step === null || step === undefined) return null;

  const text = step === 0 ? 'GO!' : String(step);

  return (
    <div className="countdown-overlay">
      <div key={text} className={`countdown-text ${step === 0 ? 'go' : ''}`}>
        {text}
      </div>
    </div>
  );
}
