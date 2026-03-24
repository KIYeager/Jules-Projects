import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Physical state
    this.position = new THREE.Vector3(0, 50, 400);
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.angularVelocity = new THREE.Vector3();

    // Mass and forces
    this.mass = 1000;
    this.thrustForce = 150000; // Increased for better scale feel
    this.torqueForce = 8000;

    // Zero-drag coasting flags (Strict Newtonian Physics)
    this.drag = 0.0;
    this.angularDrag = 0.5; // Slight damping for rotation to make it playable

    // Keyboard state
    this.keys = {
      w: false, s: false,
      a: false, d: false,
      q: false, e: false,
      ArrowUp: false, ArrowDown: false
    };

    // Placeholder Mesh
    const geometry = new THREE.ConeGeometry(2, 5, 8);
    geometry.rotateX(Math.PI / 2); // Point forward along Z
    const material = new THREE.MeshStandardMaterial({ color: 0x5555ff, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);

    // Group to hold the actual model or fallback
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    // Setup Engine Particles
    this.initParticles();

    // Try loading GLTF
    const loader = new GLTFLoader();
    loader.load(
      '/starship.glb',
      (gltf) => {
        // Success
        this.mesh.visible = false; // Hide fallback
        const model = gltf.scene;
        // Adjust scale/rotation of model if needed
        model.scale.set(0.1, 0.1, 0.1);
        this.group.add(model);
      },
      undefined,
      (error) => {
        // Fallback already exists, so just log
        console.warn('Could not load starship.glb, using fallback cone.', error);
      }
    );

    this.initInput();
  }

  initParticles() {
    // Basic Mach diamonds particle system setup
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    // Initialize particles hidden at origin
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        alphas[i] = 0;
        lifetimes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x44aaff) },
            uTime: { value: 0.0 }
        },
        vertexShader: `
            attribute float alpha;
            attribute float lifetime;
            varying float vAlpha;
            uniform float uTime;

            void main() {
                vAlpha = alpha;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = (15.0 * (1.0 - lifetime)) * (1.0 / - mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
                if (vAlpha <= 0.01) discard;

                // create circular particle
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;

                float strength = (0.5 - dist) * 2.0;
                gl_FragColor = vec4(color, vAlpha * strength);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);

    // Position it at the back of the ship
    this.particleSystem.position.set(0, 0, 5);
    this.group.add(this.particleSystem);
  }

  initInput() {
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
    });
  }

  update(delta) {
    // 1. Calculate Local Axes
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // 2. Linear Thrust (Newtonian: F = ma => a = F/m)
    const thrust = new THREE.Vector3();
    if (this.keys.w) thrust.add(forward.clone().multiplyScalar(this.thrustForce));
    if (this.keys.s) thrust.add(forward.clone().multiplyScalar(-this.thrustForce));

    const acceleration = thrust.divideScalar(this.mass);
    this.velocity.add(acceleration.multiplyScalar(delta));

    // Optional subtle drag (set to 0 for true zero-drag coasting)
    if (this.drag > 0) {
        this.velocity.multiplyScalar(1 - this.drag * delta);
    }

    // Apply velocity to position
    this.position.add(this.velocity.clone().multiplyScalar(delta));

    // 3. Angular Torque
    const torque = new THREE.Vector3();
    if (this.keys.ArrowUp) torque.x -= this.torqueForce; // Pitch up
    if (this.keys.ArrowDown) torque.x += this.torqueForce; // Pitch down
    if (this.keys.a) torque.y += this.torqueForce; // Yaw left
    if (this.keys.d) torque.y -= this.torqueForce; // Yaw right
    if (this.keys.q) torque.z += this.torqueForce; // Roll left
    if (this.keys.e) torque.z -= this.torqueForce; // Roll right

    const angularAcceleration = torque.divideScalar(this.mass);
    this.angularVelocity.add(angularAcceleration.multiplyScalar(delta));

    // Damping for angular velocity to prevent endless spinning
    this.angularVelocity.multiplyScalar(1 - this.angularDrag * delta);

    // 4. Apply Angular Velocity to Quaternion (using local space)
    const qSpin = new THREE.Quaternion();
    qSpin.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * delta);
    this.quaternion.multiply(qSpin);

    qSpin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * delta);
    this.quaternion.multiply(qSpin);

    qSpin.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.angularVelocity.z * delta);
    this.quaternion.multiply(qSpin);

    this.quaternion.normalize();

    // 5. Collision Detection
    this.checkCollisions();

    // 6. Update visual group
    this.group.position.copy(this.position);
    this.group.quaternion.copy(this.quaternion);

    // 7. Update Particles
    this.updateParticles(delta, this.keys.w);
  }

  updateParticles(delta, isThrusting) {
    if (!this.particleSystem) return;

    this.particleSystem.material.uniforms.uTime.value += delta;

    const positions = this.particleSystem.geometry.attributes.position.array;
    const alphas = this.particleSystem.geometry.attributes.alpha.array;
    const lifetimes = this.particleSystem.geometry.attributes.lifetime.array;

    for (let i = 0; i < 200; i++) {
        const i3 = i * 3;

        lifetimes[i] += delta * 2.0; // Particle speed multiplier

        if (lifetimes[i] > 1.0) {
            lifetimes[i] = 0.0;

            if (isThrusting) {
                // Reset to emission point with slight random spread
                positions[i3] = (Math.random() - 0.5) * 2.0;
                positions[i3 + 1] = (Math.random() - 0.5) * 2.0;
                positions[i3 + 2] = 0;
                alphas[i] = 1.0;
            } else {
                alphas[i] = 0.0;
            }
        }

        // Move particle backward (local Z space, relative to the ship)
        positions[i3 + 2] += delta * 50.0;

        // Fade out
        if (alphas[i] > 0) {
            alphas[i] -= delta * 1.5;
        }
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.alpha.needsUpdate = true;
    this.particleSystem.geometry.attributes.lifetime.needsUpdate = true;
  }

  checkCollisions() {
    if (!this.celestialBodies) return;

    for (let i = 0; i < this.celestialBodies.length; i++) {
      const body = this.celestialBodies[i];

      // Calculate world position of the body
      const bodyWorldPos = new THREE.Vector3();
      body.mesh.getWorldPosition(bodyWorldPos);

      // Distance from player center to body center
      const distance = this.position.distanceTo(bodyWorldPos);

      // If distance < body radius + ship radius, it's a collision
      // Adding a small padding (e.g. 5) for the ship's own radius
      if (distance < body.radius + 5) {
        this.explode();
        break; // Only explode once
      }
    }
  }

  explode() {
    console.log("Player crashed into a celestial body!");

    // Quick visual explosion (expand particles in all directions)
    if (this.particleSystem) {
        const positions = this.particleSystem.geometry.attributes.position.array;
        const alphas = this.particleSystem.geometry.attributes.alpha.array;
        for(let i=0; i<200; i++) {
            positions[i*3] = (Math.random() - 0.5) * 50;
            positions[i*3+1] = (Math.random() - 0.5) * 50;
            positions[i*3+2] = (Math.random() - 0.5) * 50;
            alphas[i] = 1.0;
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.alpha.needsUpdate = true;
    }

    // Server logic will handle this eventually but good for instant local feedback
    this.position.set(0, 50, 400);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.quaternion.identity();

    // Emit event to server (if socket is connected, which will be done in main.js)
    if (this.onExplode) {
        this.onExplode();
    }
  }
}