# 3D Solar System Exploration Game

A multiplayer 3D space exploration game restricted to our Solar System, featuring strict Newtonian physics, procedural textures, realistic scales, and a Node.js/Socket.io backend.

## Features

- **Newtonian Flight Model**: Zero-drag space physics, where the SpaceX Starship has mass, inertia, and no auto-braking.
- **Multiplayer Backend**: Node.js and Socket.io server (port 3000) supporting up to 10 concurrent players synchronized at 60 tick-rate.
- **Procedural Solar System**: Dynamically generated Sun, 8 major planets, and the Moon with relatively scaled distances and sizes.
- **Cinematic Graphics**: Advanced post-processing pipeline featuring HDR rendering, high-quality anti-aliasing, Unreal Bloom for the Sun, and Mach diamond engine trails.
- **Collision Physics**: Bounding sphere detection. Crashing into celestial bodies results in immediate destruction and respawning.

## How to Run the Application

You must start the backend server and the frontend development server separately.

1. Ensure you have Node.js installed.
2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the multiplayer backend server (required for the frontend to connect):
   ```bash
   node server.js
   # Or alternatively: npm start
   ```

4. In a separate terminal, start the Vite development frontend server:
   ```bash
   npm run dev
   ```
5. Open your browser to the URL provided by Vite (typically `http://localhost:5173`).

## Controls

* **W / S**: Forward / Backward Thrust
* **A / D**: Yaw Left / Right
* **Q / E**: Roll Left / Right
* **Up / Down Arrows**: Pitch Up / Down
