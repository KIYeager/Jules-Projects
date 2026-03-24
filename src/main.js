import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { io } from 'socket.io-client';

import { Galaxy } from './Galaxy.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';

// --- Socket.io Setup ---
const socket = io();
const otherPlayers = {};

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
const galaxy = new Galaxy(scene, 100000); // Pass in scene and number of stars

const player = new Player(scene);

const cameraController = new CameraController(camera, player);
cameraController.currentPosition.copy(camera.position);
cameraController.currentQuaternion.copy(camera.quaternion);

// Add simple lighting for the player mesh
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(100, 100, 100);
scene.add(directionalLight);

// --- Multiplayer Client Logic ---
function addOtherPlayer(playerInfo) {
  // Use a simple cone for other players, identical to local player's shape
  const geometry = new THREE.ConeGeometry(2, 5, 8);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: playerInfo.color,
    wireframe: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(playerInfo.position.x, playerInfo.position.y, playerInfo.position.z);

  scene.add(mesh);
  otherPlayers[playerInfo.playerId] = mesh;
}

socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id) {
      // It's another player, add them with their id attached to info
      players[id].playerId = id;
      addOtherPlayer(players[id]);
    }
  });
});

socket.on('newPlayer', (playerData) => {
  addOtherPlayer(playerData.playerInfo);
});

socket.on('playerMoved', (playerData) => {
  const mesh = otherPlayers[playerData.playerId];
  if (mesh) {
    mesh.position.set(playerData.playerInfo.position.x, playerData.playerInfo.position.y, playerData.playerInfo.position.z);
    mesh.quaternion.set(
      playerData.playerInfo.quaternion.x,
      playerData.playerInfo.quaternion.y,
      playerData.playerInfo.quaternion.z,
      playerData.playerInfo.quaternion.w
    );
  }
});

socket.on('playerDisconnected', (playerId) => {
  const mesh = otherPlayers[playerId];
  if (mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
    scene.remove(mesh);
    delete otherPlayers[playerId];
  }
});

socket.on('serverFull', (msg) => {
  console.warn(msg);
  alert(msg);
});


// --- Main Render Loop ---
const clock = new THREE.Clock();

// Variables for network sync throttling
const tickRate = 20; // Emits per second
const timeBetweenTicks = 1.0 / tickRate;
let timeSinceLastTick = 0;

function animate() {
  requestAnimationFrame(animate);

  // Cap delta time to prevent large jumps if the tab is inactive
  const delta = Math.min(clock.getDelta(), 0.1);

  galaxy.update(delta);
  player.update(delta);
  cameraController.update(delta);

  // Sync player position at a fixed tick rate
  timeSinceLastTick += delta;
  if (timeSinceLastTick >= timeBetweenTicks) {
    socket.emit('playerMovement', {
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      quaternion: { x: player.quaternion.x, y: player.quaternion.y, z: player.quaternion.z, w: player.quaternion.w }
    });
    timeSinceLastTick = 0;
  }

  composer.render();
}

animate();
