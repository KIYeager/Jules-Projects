import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
  constructor(scene, socket, isLocal = false, id = null) {
    this.scene = scene;
    this.socket = socket;
    this.isLocal = isLocal;
    this.id = id;

    // Physical state
    this.position = new THREE.Vector3(225, 10, 0); // Start near Earth
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3();

    // Mass and forces
    this.mass = 1200; // t
    this.thrustForce = 60000;
    this.torqueForce = 3000;

    this.drag = 0.0;
    this.angularDrag = 0.6;

    this.thrusting = false;
    this.keys = { w: false, s: false, a: false, d: false, q: false, e: false, ArrowUp: false, ArrowDown: false };

    this.initMesh();
    this.initParticles();
    this.initExplosionParticles();
    if (this.isLocal) this.initInput();
  }

  initMesh() {
    // Detailed procedural starship-like shape (until GLTF loads)
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.5, 1.5, 16);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -2.75;
    group.add(nose);

    const finGeo = new THREE.BoxGeometry(2, 0.1, 1);
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.z = 1;
    group.add(fin);

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Attempt GLTF load
    const loader = new GLTFLoader();
    // Example public URL for a placeholder starship if one was available
    // loader.load('https://raw.githubusercontent.com/.../starship.glb', (gltf) => { ... });
  }

  initParticles() {
    const count = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 0.3, color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
    this.particleData = Array.from({ length: count }, () => ({ velocity: new THREE.Vector3(), life: 0 }));
  }

  initExplosionParticles() {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 0.6, color: 0xffaa00, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending });
    this.explosionParticles = new THREE.Points(geometry, material);
    this.scene.add(this.explosionParticles);
    this.explosionData = Array.from({ length: count }, () => ({ velocity: new THREE.Vector3(), life: 0 }));
  }

  initInput() {
    window.addEventListener('keydown', (e) => { if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false; });
  }

  update(delta, celestialBodies) {
    if (this.isLocal) {
        this.handleMovement(delta);
        this.checkCollisions(celestialBodies);
        this.emitState();
    }
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
    this.updateParticles(delta);
    this.updateExplosion(delta);
  }

  updateParticles(delta) {
    const positions = this.particles.geometry.attributes.position.array;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const exhaustPos = this.position.clone().add(forward.clone().multiplyScalar(-2.5));

    for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        if (p.life <= 0 && this.thrusting) {
            p.life = 1.0;
            positions[i * 3] = exhaustPos.x;
            positions[i * 3 + 1] = exhaustPos.y;
            positions[i * 3 + 2] = exhaustPos.z;
            p.velocity.copy(forward).multiplyScalar(-30 - Math.random() * 20);
        } else if (p.life > 0) {
            p.life -= delta * 3;
            positions[i * 3] += p.velocity.x * delta;
            positions[i * 3 + 1] += p.velocity.y * delta;
            positions[i * 3 + 2] += p.velocity.z * delta;
        } else {
            positions[i * 3 + 1] = -10000;
        }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateExplosion(delta) {
    const positions = this.explosionParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.explosionData.length; i++) {
        const p = this.explosionData[i];
        if (p.life > 0) {
            p.life -= delta;
            positions[i * 3] += p.velocity.x * delta;
            positions[i * 3 + 1] += p.velocity.y * delta;
            positions[i * 3 + 2] += p.velocity.z * delta;
        } else {
            positions[i * 3 + 1] = -10000;
        }
    }
    this.explosionParticles.geometry.attributes.position.needsUpdate = true;
  }

  handleMovement(delta) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const thrust = new THREE.Vector3();
    this.thrusting = false;
    if (this.keys.w) { thrust.add(forward.clone().multiplyScalar(this.thrustForce)); this.thrusting = true; }
    if (this.keys.s) { thrust.add(forward.clone().multiplyScalar(-this.thrustForce)); this.thrusting = true; }

    this.velocity.add(thrust.divideScalar(this.mass).multiplyScalar(delta));
    this.position.add(this.velocity.clone().multiplyScalar(delta));

    const torque = new THREE.Vector3();
    if (this.keys.ArrowUp) torque.x -= this.torqueForce;
    if (this.keys.ArrowDown) torque.x += this.torqueForce;
    if (this.keys.a) torque.y += this.torqueForce;
    if (this.keys.d) torque.y -= this.torqueForce;
    if (this.keys.q) torque.z += this.torqueForce;
    if (this.keys.e) torque.z -= this.torqueForce;

    this.angularVelocity.add(torque.divideScalar(this.mass).multiplyScalar(delta));
    this.angularVelocity.multiplyScalar(1 - this.angularDrag * delta);

    const qSpin = new THREE.Quaternion();
    qSpin.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * delta);
    this.quaternion.multiply(qSpin);
    qSpin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * delta);
    this.quaternion.multiply(qSpin);
    qSpin.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.angularVelocity.z * delta);
    this.quaternion.multiply(qSpin);
    this.quaternion.normalize();
  }

  checkCollisions(celestialBodies) {
    if (!celestialBodies) return;
    for (const body of celestialBodies) {
        const bodyWorldPos = new THREE.Vector3();
        body.mesh.getWorldPosition(bodyWorldPos);
        const dist = this.position.distanceTo(bodyWorldPos);
        if (dist < body.radius + 1) {
            this.triggerExplosion();
            this.handleCrash();
            break;
        }
    }
  }

  triggerExplosion() {
    const positions = this.explosionParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.explosionData.length; i++) {
        const p = this.explosionData[i];
        p.life = 1.0;
        positions[i * 3] = this.position.x;
        positions[i * 3 + 1] = this.position.y;
        positions[i * 3 + 2] = this.position.z;
        p.velocity.set((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
    }
  }

  handleCrash() {
    if (this.socket) this.socket.emit('playerCrash', { id: this.id });
    this.position.set(225, 10, 0); // Respawn near Earth
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
  }

  emitState() {
    if (this.socket) {
      this.socket.emit('playerUpdate', {
        position: { x: this.position.x, y: this.position.y, z: this.position.z },
        quaternion: { x: this.quaternion.x, y: this.quaternion.y, z: this.quaternion.z, w: this.quaternion.w },
        thrusting: this.thrusting
      });
    }
  }

  updateFromRemote(data) {
    this.position.set(data.position.x, data.position.y, data.position.z);
    this.quaternion.set(data.quaternion.x, data.quaternion.y, data.quaternion.z, data.quaternion.w);
    this.thrusting = data.thrusting;
  }
}
