import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

// Serve static files from 'dist' if building for production, or serve a simple message
// The dev server will handle the frontend.

// --- Multiplayer Logic ---
const MAX_PLAYERS = 10;
const players = {}; // Map socket.id -> player state

// Server tick rate
const TICK_RATE = 60; // 60 updates per second
const TICK_INTERVAL = 1000 / TICK_RATE;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (Object.keys(players).length >= MAX_PLAYERS) {
    console.log(`Server full. Rejecting connection: ${socket.id}`);
    socket.emit('server_full', { message: 'The server is currently full.' });
    socket.disconnect(true);
    return;
  }

  // Initialize player state
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 50, z: 400 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    thrusting: false // For VFX
  };

  // Send the new player the current state of all players
  socket.emit('init_state', players);

  // Notify others about the new player
  socket.broadcast.emit('player_joined', players[socket.id]);

  socket.on('player_update', (data) => {
    // Client sends position, quaternion, and thrust state
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].quaternion = data.quaternion;
      players[socket.id].thrusting = data.thrusting;
    }
  });

  socket.on('player_destroyed', () => {
      // Could broadcast an explosion event, handle respawn location
      console.log(`Player destroyed: ${socket.id}`);

      // Reset position
      if (players[socket.id]) {
          players[socket.id].position = { x: 0, y: 50, z: 400 };
          players[socket.id].quaternion = { x: 0, y: 0, z: 0, w: 1 };
          players[socket.id].thrusting = false;

          socket.emit('respawn', players[socket.id]);
          io.emit('player_exploded', { id: socket.id });
      }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('player_left', socket.id);
  });
});

// Broadcast game state to all clients at the specified tick rate
setInterval(() => {
  io.volatile.emit('game_state_update', players);
}, TICK_INTERVAL);


const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
