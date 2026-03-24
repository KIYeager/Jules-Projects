import * as THREE from 'three';

export class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target; // The object the camera follows (e.g., Player)

    // Configuration for smooth cinematic damping
    this.positionLerpFactor = 0.1; // Lower is smoother/slower, higher is tighter
    this.quaternionSlerpFactor = 0.1; // Smooth rotation

    // Offset from the target (e.g., slightly behind and above for third-person)
    this.offset = new THREE.Vector3(0, 5, 20);

    // Variables for storing calculated position/rotation
    this.currentPosition = new THREE.Vector3();
    this.currentQuaternion = new THREE.Quaternion();
  }

  update(delta) {
    if (!this.target) return;

    // Calculate the desired position based on the target's rotation and offset
    const desiredPosition = this.target.position.clone();

    const localOffset = this.offset.clone();
    localOffset.applyQuaternion(this.target.quaternion);

    desiredPosition.add(localOffset);

    // Smoothly interpolate the camera's position to the desired position
    this.currentPosition.lerp(desiredPosition, this.positionLerpFactor);
    this.camera.position.copy(this.currentPosition);

    // Smoothly interpolate (slerp) the camera's rotation to the target's rotation
    // This avoids gimbal lock and produces buttery-smooth turning.
    this.currentQuaternion.slerp(this.target.quaternion, this.quaternionSlerpFactor);
    this.camera.quaternion.copy(this.currentQuaternion);
  }
}