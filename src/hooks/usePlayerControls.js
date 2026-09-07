import { useEffect, useRef, useState } from 'react';
import { DEFAULT_KEY_BINDINGS } from '../utils/constants';
import { audioManager } from '../audio/AudioManager';

export function usePlayerControls(customKeyBindings = null, options = {}) {
  const bindings = customKeyBindings || DEFAULT_KEY_BINDINGS;
  const { mouseSteering = false } = options;

  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Use ref for real-time 60fps reads in game loop without causing React re-renders
  const controlsRef = useRef({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    resetCar: false,
    changeCamera: false,
    pause: false
  });

  const keysPressed = useRef({});
  const mouseSteerVal = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      audioManager.init();
      audioManager.resume();

      // Prevent browser default scroll for game control keys
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }

      if (e.code) keysPressed.current[e.code] = true;
      if (e.key) {
        keysPressed.current[e.key] = true;
        keysPressed.current[e.key.toLowerCase()] = true;
      }

      // Single pulse triggers
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        controlsRef.current.resetCar = true;
      }
      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        controlsRef.current.changeCamera = true;
      }
      if (e.code === 'Escape' || e.key === 'Escape') {
        controlsRef.current.pause = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.code) keysPressed.current[e.code] = false;
      if (e.key) {
        keysPressed.current[e.key] = false;
        keysPressed.current[e.key.toLowerCase()] = false;
      }
    };

    const handleMouseMove = (e) => {
      if (!mouseSteering) return;
      const center = window.innerWidth / 2;
      const offset = (e.clientX - center) / (center * 0.7);
      mouseSteerVal.current = Math.max(-1, Math.min(1, offset));
    };

    const handleGamepadConnected = () => setGamepadConnected(true);
    const handleGamepadDisconnected = () => setGamepadConnected(false);

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, [mouseSteering]);

  // Method to poll and compute effective inputs each frame
  const pollInputs = () => {
    const kp = keysPressed.current;
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;
    let nitro = false;

    // Up Arrow / W = Accelerate
    if (kp['KeyW'] || kp['w'] || kp['W'] || kp['ArrowUp'] || kp['Up']) {
      throttle = 1;
    }
    // Down Arrow / S = Brake / Reverse
    if (kp['KeyS'] || kp['s'] || kp['S'] || kp['ArrowDown'] || kp['Down']) {
      brake = 1;
    }
    // Left Arrow / A -> Steer (Swapped as requested)
    if (kp['KeyA'] || kp['a'] || kp['A'] || kp['ArrowLeft'] || kp['Left']) {
      steer += 1;
    }
    // Right Arrow / D -> Steer (Swapped as requested)
    if (kp['KeyD'] || kp['d'] || kp['D'] || kp['ArrowRight'] || kp['Right']) {
      steer -= 1;
    }
    // Spacebar = Handbrake / Drift
    if (kp['Space'] || kp[' '] || kp['Spacebar']) {
      handbrake = true;
    }
    // Shift = Nitro
    if (kp['ShiftLeft'] || kp['ShiftRight'] || kp['Shift']) {
      nitro = true;
    }

    // Mouse Steering
    if (mouseSteering && steer === 0) {
      steer = mouseSteerVal.current;
    }

    // Gamepad API check
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        // Left stick X for steering
        if (Math.abs(gp.axes[0]) > 0.1) {
          steer = gp.axes[0];
        }
        // Right trigger (R2) for throttle
        if (gp.buttons[7] && gp.buttons[7].value > 0.05) {
          throttle = gp.buttons[7].value;
        } else if (gp.buttons[0] && gp.buttons[0].pressed) { // A button
          throttle = 1;
        }
        // Left trigger (L2) for brake
        if (gp.buttons[6] && gp.buttons[6].value > 0.05) {
          brake = gp.buttons[6].value;
        } else if (gp.buttons[2] && gp.buttons[2].pressed) { // X button
          brake = 1;
        }
        // Handbrake: B button (1) or R1 (5)
        if ((gp.buttons[1] && gp.buttons[1].pressed) || (gp.buttons[5] && gp.buttons[5].pressed)) {
          handbrake = true;
        }
        // Nitro: Y button (3) or L1 (4)
        if ((gp.buttons[3] && gp.buttons[3].pressed) || (gp.buttons[4] && gp.buttons[4].pressed)) {
          nitro = true;
        }
        // Camera: View/Select button (8)
        if (gp.buttons[8] && gp.buttons[8].pressed) {
          controlsRef.current.changeCamera = true;
        }
        // Pause: Menu/Start button (9)
        if (gp.buttons[9] && gp.buttons[9].pressed) {
          controlsRef.current.pause = true;
        }
      }
    }

    controlsRef.current.throttle = throttle;
    controlsRef.current.brake = brake;
    controlsRef.current.steer = steer;
    controlsRef.current.handbrake = handbrake;
    controlsRef.current.nitro = nitro;

    return controlsRef.current;
  };

  const consumePulse = (action) => {
    const val = controlsRef.current[action];
    controlsRef.current[action] = false;
    return val;
  };

  return {
    controlsRef,
    pollInputs,
    consumePulse,
    gamepadConnected
  };
}
