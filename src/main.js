import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { SolarSystem } from './SolarSystem.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { io } from 'socket.io-client';

// --- Network Setup ---
const socket = io(); // Connects to the host server running on the same port

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
});

socket.on('server_full', (data) => {
  alert(data.message);
});

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  20000
);
// Initial camera position will be handled by the CameraController later
camera.position.set(0, 50, 200);

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Tone mapping for HDR feel and cinematic look
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Post-Processing Setup ---
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Subtle bloom for stars
// Resolution, strength, radius, threshold
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // strength
  0.4, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);

// --- Resize Handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- Game Objects Setup ---
const solarSystem = new SolarSystem(scene);

const player = new Player(scene);
// Give the player reference to celestial bodies for collision later
player.celestialBodies = solarSystem.celestialBodies;

// Callback for server notification on destruction
player.onExplode = () => {
  socket.emit('player_destroyed');
};

const cameraController = new CameraController(camera, player);
cameraController.currentPosition.copy(camera.position);
cameraController.currentQuaternion.copy(camera.quaternion);


// --- Main Render Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  // Cap delta time to prevent large jumps if the tab is inactive
  const delta = Math.min(clock.getDelta(), 0.1);

  solarSystem.update(delta);
  player.update(delta);
  cameraController.update(delta);

  // Send local state to server
  if (socket.connected) {
    socket.emit('player_update', {
      position: player.position,
      quaternion: {
        x: player.quaternion.x,
        y: player.quaternion.y,
        z: player.quaternion.z,
        w: player.quaternion.w
      },
      thrusting: player.keys.w
    });
  }

  // Interpolate remote players
  for (const id in remotePlayers) {
    const remote = remotePlayers[id];
    // Interpolate positions to smooth out tick rate (client-side prediction/interpolation)
    remote.mesh.position.lerp(remote.targetPosition, 0.1);
    remote.mesh.quaternion.slerp(remote.targetQuaternion, 0.1);

    // Quick engine visual for remote players
    if (remote.thrusting) {
        // Just make them glow a bit for simplicity in this example
        remote.mesh.material.emissive.setHex(0x44aaff);
    } else {
        remote.mesh.material.emissive.setHex(0x000000);
    }
  }

  composer.render();
}

// --- Multiplayer State Management ---
const remotePlayers = {}; // Map id -> { mesh, targetPosition, targetQuaternion, thrusting }

function createRemotePlayerMesh() {
  const geometry = new THREE.ConeGeometry(2, 5, 8);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({ color: 0xff5555, wireframe: true });
  return new THREE.Mesh(geometry, material);
}

socket.on('init_state', (playersData) => {
  for (const id in playersData) {
    if (id !== socket.id) {
      addRemotePlayer(playersData[id]);
    } else {
      // Local player init (if server assigns start pos)
      const data = playersData[id];
      player.position.copy(data.position);
      player.quaternion.copy(data.quaternion);
    }
  }
});

socket.on('player_joined', (playerData) => {
  if (playerData.id !== socket.id) {
    addRemotePlayer(playerData);
  }
});

socket.on('player_left', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id].mesh);
    delete remotePlayers[id];
  }
});

socket.on('game_state_update', (playersData) => {
  for (const id in playersData) {
    if (id !== socket.id && remotePlayers[id]) {
      const data = playersData[id];
      remotePlayers[id].targetPosition.copy(data.position);
      remotePlayers[id].targetQuaternion.copy(data.quaternion);
      remotePlayers[id].thrusting = data.thrusting;
    }
  }
});

socket.on('respawn', (data) => {
  player.position.copy(data.position);
  player.quaternion.copy(data.quaternion);
  player.velocity.set(0, 0, 0);
  player.angularVelocity.set(0, 0, 0);
});

function addRemotePlayer(data) {
  if (!remotePlayers[data.id]) {
    const mesh = createRemotePlayerMesh();
    mesh.position.copy(data.position);
    mesh.quaternion.copy(data.quaternion);
    scene.add(mesh);

    remotePlayers[data.id] = {
      mesh: mesh,
      targetPosition: new THREE.Vector3().copy(data.position),
      targetQuaternion: new THREE.Quaternion().copy(data.quaternion),
      thrusting: data.thrusting
    };
  }
}

animate();
