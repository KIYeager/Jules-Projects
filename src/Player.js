import * as THREE from 'three';

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
    this.thrustForce = 50000;
    this.torqueForce = 2000;

    // Zero-drag coasting flags
    this.drag = 0.0;
    this.angularDrag = 0.5; // Slight damping for rotation to make it playable

    // Keyboard state
    this.keys = {
      w: false, s: false,
      a: false, d: false,
      q: false, e: false,
      ArrowUp: false, ArrowDown: false
    };

    // Initialize visual representation (optional, can be invisible if first-person)
    const geometry = new THREE.ConeGeometry(2, 5, 8);
    geometry.rotateX(Math.PI / 2); // Point forward along Z
    const material = new THREE.MeshStandardMaterial({ color: 0x5555ff, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    this.initInput();
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

    // 5. Update visual mesh
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
  }
}