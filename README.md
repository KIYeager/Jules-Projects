# 3D Milky Way Exploration Game

A data-driven 3D space exploration game set in the Milky Way, featuring hyper-realistic physics, cinematic graphics, and environments based on real astronomical data.

## Features

- **Data-Driven Environment**: Galaxy generated mimicking the Gaia DR3 catalog, complete with spiral arms, dense galactic center, and correct star color temperatures.
- **High-Performance Rendering**: Renders 100,000+ stars efficiently at 60+ FPS using custom shaders and buffer geometries.
- **Cinematic Graphics**: Advanced post-processing pipeline featuring HDR rendering, high-quality anti-aliasing, and subtle bloom.
- **Realistic Newtonian Physics**: Player movement governed by strict Newtonian mechanics (thrust, inertia, mass, and zero-drag coasting).
- **Smooth Camera Movement**: Custom quaternion-based camera controller providing butter-smooth, cinematic easing without gimbal lock.

## Multiplayer Mode

Up to 10 players can explore the Milky Way together simultaneously.

1. Ensure you have Node.js installed.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Build the static assets:
   ```bash
   npm run build
   ```
4. Start the multiplayer server:
   ```bash
   npm start
   ```
5. Players can join by navigating to your machine's IP address on port `3000` (e.g., `http://192.168.1.5:3000`).

## Controls

* **W / S**: Forward / Backward Thrust
* **A / D**: Yaw Left / Right
* **Q / E**: Roll Left / Right
* **Up / Down Arrows**: Pitch Up / Down
