# 🏎️ Turbo Rush 3D - Realistic Web Racing Game

A full-featured, realistic 3D car racing game built for the modern web using **React**, **Three.js**, and dedicated vehicle physics simulation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)

---

## 🌟 Features

### 🏎️ Realistic Vehicle Dynamics
- **Pacejka Lateral Friction**: Non-linear tire grip curves for responsive steering, counter-steering, and progressive breakaways.
- **Dynamic Weight Transfer**: Pitch under hard acceleration and braking; roll through high-g corners.
- **Transmission & RPM**: Multi-gear automatic shifting with realistic RPM torque bands, redlines, and high-torque reverse gear.
- **Drift Mechanics**: Initiate power slides using the handbrake or aggressive cornering, with a real-time drift score counter and combo multipliers up to 5.0x.
- **Surface Friction**: Dynamic grip simulation across dry asphalt, wet rain slicks, and storm conditions.

### 🏁 4 Detailed Race Circuits
1. **City Circuit**: Metropolis street circuit featuring illuminated skyscrapers, multi-tier overpasses, glowing windows, and highway safety barriers.
2. **Mountain Pass**: Alpine circuit with steep elevation changes, cliffside drop-offs, pine forests, and rocky mountain walls.
3. **Desert Circuit**: High-speed red rock canyon speedway with sandstone mesas, desert cacti, and long sweeping straights.
4. **Coastal Circuit**: Riviera seaside boulevard with suspension bridges, palm trees, and ocean views.

### 🚗 6 Distinct Race Cars
- **Street GT**: Balanced starter coupe with reliable handling and forgiving drift characteristics.
- **Velocity R**: Lightweight trackday specialist with rapid twin-turbo acceleration.
- **Torque X**: American muscle car with immense low-end torque and high top speed.
- **Apex RS**: Precision German sports coupe built for technical cornering and high downforce.
- **Phantom GT**: Exotic mid-engine supercar with extreme top speed and aerodynamic balance.
- **Titan V12**: Ultimate V12 hypercar boasting maximum horsepower and downforce.

### 🔧 3D Garage & Customization
- **Showroom Turntable**: 360° interactive car inspection with smooth cinematic orbiting.
- **Performance Tuning Tree**: 7 upgrade categories across 3 stages each (Engine, Brakes, Tires, Suspension, Transmission, Aerodynamics, Nitro).
- **Aesthetic Customization**: 12 body colors, 4 paint finishes (*Gloss*, *Metallic*, *Matte*, *Pearl*), custom sport spoilers, and alloy wheel rim designs.
- **In-Game Economy**: Earn credits and XP based on race position, clean laps, and drift points to unlock new cars and upgrades.

### 🤖 Intelligent AI Opponents
- **7 AI Grid Racers**: Individual racing lines, corner entry braking points, slipstream overtaking, and defensive maneuvers.
- **4 Difficulty Levels**: *Easy*, *Normal*, *Hard*, and *Expert* presets tuning AI precision and speed.

### 🔊 Procedural Web Audio Engine
- Synthesized multi-harmonic engine RPM audio built with Web Audio API oscillators.
- Dynamic tire screech during drifts and hard braking.
- Turbo spool and blow-off valve sound effects.
- High-speed wind rush, collision impact crunches, and 3-2-1 race countdown beeps.
- Energetic synthwave soundtrack.

### 🎥 Dynamic Camera System
5 switchable camera modes (`C` key):
- **Chase**: Standard third-person chase camera with dynamic speed FOV expansion.
- **Close Chase**: Tighter cinematic third-person view.
- **Hood**: Low-angle bonnet camera capturing high-speed road sensation.
- **Cockpit**: First-person dashboard driver perspective.
- **Cinematic**: Orbiting camera highlighting vehicle motion.

---

## 🎮 Controls

| Action | Primary Key | Alternate |
| :--- | :--- | :--- |
| **Accelerate** | `Up Arrow` | `W` |
| **Brake / Reverse** | `Down Arrow` | `S` |
| **Steer Left** | `Right Arrow` | `D` |
| **Steer Right** | `Left Arrow` | `A` |
| **Handbrake (Drift)** | `Spacebar` | Gamepad B |
| **Nitro Boost** | `Shift` | Gamepad Y |
| **Change Camera** | `C` | - |
| **Reset Car to Track**| `R` | - |
| **Pause Game** | `Escape` | Gamepad Start |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/ggthedeveloper/Car-Racing-3D.git

# Navigate to project directory
cd Car-Racing-3D

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open `http://localhost:3000` (or the port shown in your terminal) in any modern browser to play!

### Production Build
```bash
# Build optimized assets
npm run build

# Preview production build locally
npm run preview
```

---

## 🛠️ Tech Stack
- **Framework**: [React 18](https://react.dev/)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **Build Tool**: [Vite 5](https://vitejs.dev/)
- **Audio**: Web Audio API (Pure procedural synthesis)
- **Effects**: Custom GPU particle system & procedural canvas textures

---

## 📄 License
This project is licensed under the MIT License.
