import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Send index.html for any other requests
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Multiplayer Logic ---
const players = {};
const MAX_PLAYERS = 10;

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('serverFull', 'The server is currently full.');
    socket.disconnect();
    return;
  }

  console.log(`Player connected: ${socket.id}`);

  // Initialize a new player
  players[socket.id] = {
    position: { x: 0, y: 50, z: 400 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    color: Math.floor(Math.random() * 0xffffff) // Random color for distinct players
  };

  // Send the newly connected player all existing players
  socket.emit('currentPlayers', players);

  // Broadcast to all other players that a new player has joined
  socket.broadcast.emit('newPlayer', {
    playerId: socket.id,
    playerInfo: players[socket.id]
  });

  // Listen for movement updates from this player
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].position = movementData.position;
      players[socket.id].quaternion = movementData.quaternion;

      // Broadcast this update to all other players
      socket.broadcast.emit('playerMoved', {
        playerId: socket.id,
        playerInfo: players[socket.id]
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
