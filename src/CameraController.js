import * as THREE from 'three';

export class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;

    this.positionLerpFactor = 0.05;
    this.quaternionSlerpFactor = 0.1;

    this.baseOffset = new THREE.Vector3(0, 5, 20);
    this.currentOffset = new THREE.Vector3().copy(this.baseOffset);

    this.currentPosition = new THREE.Vector3();
    this.currentQuaternion = new THREE.Quaternion();

    this.shakeAmount = 0;
  }

  update(delta) {
    if (!this.target) return;

    const targetVelocityLength = this.target.velocity ? this.target.velocity.length() : 0;
    const lagAmount = Math.min(targetVelocityLength * 0.1, 20);

    const desiredOffset = this.baseOffset.clone();
    desiredOffset.z += lagAmount;
    this.currentOffset.lerp(desiredOffset, 0.1);

    const desiredPosition = this.target.position.clone();
    const localOffset = this.currentOffset.clone().applyQuaternion(this.target.quaternion);
    desiredPosition.add(localOffset);

    // Apply Camera Shake during thrust
    if (this.target.thrusting) {
        this.shakeAmount = THREE.MathUtils.lerp(this.shakeAmount, 0.5, 0.1);
    } else {
        this.shakeAmount = THREE.MathUtils.lerp(this.shakeAmount, 0, 0.1);
    }

    if (this.shakeAmount > 0.01) {
        desiredPosition.x += (Math.random() - 0.5) * this.shakeAmount;
        desiredPosition.y += (Math.random() - 0.5) * this.shakeAmount;
    }

    this.currentPosition.lerp(desiredPosition, this.positionLerpFactor);
    this.camera.position.copy(this.currentPosition);

    this.currentQuaternion.slerp(this.target.quaternion, this.quaternionSlerpFactor);
    this.camera.quaternion.copy(this.currentQuaternion);

    // FOV Widening effect
    const desiredFov = this.target.thrusting ? 90 : 75;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 0.05);
    this.camera.updateProjectionMatrix();
  }
}
