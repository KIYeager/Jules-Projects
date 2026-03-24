# 3D Milky Way Exploration Game

A data-driven 3D space exploration game set in the Milky Way, featuring hyper-realistic physics, cinematic graphics, and environments based on real astronomical data.

## Features

- **Data-Driven Environment**: Galaxy generated mimicking the Gaia DR3 catalog, complete with spiral arms, dense galactic center, and correct star color temperatures.
- **High-Performance Rendering**: Renders 100,000+ stars efficiently at 60+ FPS using custom shaders and buffer geometries.
- **Cinematic Graphics**: Advanced post-processing pipeline featuring HDR rendering, high-quality anti-aliasing, and subtle bloom.
- **Realistic Newtonian Physics**: Player movement governed by strict Newtonian mechanics (thrust, inertia, mass, and zero-drag coasting).
- **Smooth Camera Movement**: Custom quaternion-based camera controller providing butter-smooth, cinematic easing without gimbal lock.

## How to Run the Dev Server

This project uses Vite for lightning-fast development.

1. Ensure you have Node.js installed.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL provided by Vite (typically `http://localhost:5173`).

## Controls

* **W / S**: Forward / Backward Thrust
* **A / D**: Yaw Left / Right
* **Q / E**: Roll Left / Right
* **Up / Down Arrows**: Pitch Up / Down
