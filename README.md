# 3D Multiplayer Solar System Exploration Game

A realistic 3D space exploration game featuring SpaceX Starship rockets, Newtonian physics, and a multiplayer experience.

## Features
- **Strict Newtonian Physics**: 6-DOF movement with mass, inertia, and zero-drag coasting.
- **Solar System Simulation**: The Sun, 8 planets, and major moons (Moon, Io, Europa, Ganymede, Callisto, Titan).
- **Multiplayer**: Sync player states at 30Hz using Socket.io (up to 10 players).
- **High-Fidelity VFX**: Unreal Bloom, engine exhaust particles, explosion effects, and camera shake.

## Installation
1. Ensure you have Node.js installed.
2. Clone this repository.
3. Install the dependencies:
   ```bash
   npm install
   ```

## Starting the Game
To run the game, simply start the Node.js server:
```bash
node server.js
```
The game will be accessible at `http://localhost:3000` (or `http://YOUR_IP:3000`).

## Controls
- **W / S**: Forward / Backward Thrust
- **A / D**: Yaw Left / Right
- **Q / E**: Roll Left / Right
- **Up / Down Arrows**: Pitch Up / Down
- **Note**: There is no auto-braking. Use "flip and burn" to slow down.
