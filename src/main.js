import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { io } from 'socket.io-client';

import { SolarSystem } from './SolarSystem.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

// --- Starfield ---
function createStarfield() {
    const count = 10000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const [x, y, z] = [
            (Math.random() - 0.5) * 20000,
            (Math.random() - 0.5) * 20000,
            (Math.random() - 0.5) * 20000
        ];
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
}
createStarfield();

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// --- Post-Processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

// --- Game Objects ---
const solarSystem = new SolarSystem(scene);
const socket = io();
let player = null;
let cameraController = null;
const remotePlayers = {};

socket.on('connect', () => {
    player = new Player(scene, socket, true);
    cameraController = new CameraController(camera, player);
});

socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id) remotePlayers[id] = new Player(scene, null, false, id);
    });
});

socket.on('newPlayer', (playerData) => {
    if (playerData.id !== socket.id) remotePlayers[playerData.id] = new Player(scene, null, false, playerData.id);
});

socket.on('playerDisconnected', (id) => {
    if (remotePlayers[id]) {
        scene.remove(remotePlayers[id].mesh);
        scene.remove(remotePlayers[id].particles);
        scene.remove(remotePlayers[id].explosionParticles);
        delete remotePlayers[id];
    }
});

socket.on('stateUpdate', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id && remotePlayers[id]) remotePlayers[id].updateFromRemote(players[id]);
    });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  solarSystem.update(delta);
  if (player) player.update(delta, solarSystem.celestialBodies);
  Object.values(remotePlayers).forEach(p => p.update(delta));
  if (cameraController) cameraController.update(delta);
  composer.render();
}
animate();
