import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3000;
const MAX_PLAYERS = 10;
const TICK_RATE = 30;

const players = {};

app.use('/src', express.static(path.join(__dirname, 'src')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('error', 'Server is full');
    socket.disconnect();
    return;
  }

  players[socket.id] = { id: socket.id, position: { x: 225, y: 10, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 }, thrusting: false };
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('playerUpdate', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].quaternion = data.quaternion;
      players[socket.id].thrusting = data.thrusting;
    }
  });

  socket.on('playerCrash', (data) => {
    socket.broadcast.emit('playerExploded', data.id);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

setInterval(() => io.emit('stateUpdate', players), 1000 / TICK_RATE);

httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
