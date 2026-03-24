import * as THREE from 'three';

export class CameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target; // The object the camera follows (e.g., Player)

    // Configuration for smooth cinematic damping
    this.positionLerpFactor = 0.1; // Lower is smoother/slower, higher is tighter
    this.quaternionSlerpFactor = 0.1; // Smooth rotation

    // Offset from the target (e.g., slightly behind and above for third-person)
    this.baseOffset = new THREE.Vector3(0, 5, 20);
    this.offset = this.baseOffset.clone();

    // Variables for storing calculated position/rotation
    this.currentPosition = new THREE.Vector3();
    this.currentQuaternion = new THREE.Quaternion();

    // Field of view base and shake intensity
    this.baseFov = this.camera.fov;
    this.shakeIntensity = 0;
  }

  update(delta) {
    if (!this.target) return;

    // 1. Calculate dynamic offset and FOV based on thrusting
    const isThrusting = this.target.keys && this.target.keys.w;

    if (isThrusting) {
        // Lag slightly behind by extending Z offset
        this.offset.z = THREE.MathUtils.lerp(this.offset.z, this.baseOffset.z + 5, 0.05);
        // Widen FOV for visceral speed feel
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov + 10, 0.05);
        // Add shake intensity
        this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, 0.5, 0.1);
    } else {
        // Recover to base
        this.offset.z = THREE.MathUtils.lerp(this.offset.z, this.baseOffset.z, 0.05);
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, 0.05);
        this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, 0, 0.1);
    }

    this.camera.updateProjectionMatrix();

    // 2. Calculate the desired position based on the target's rotation and offset
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

    // Apply camera shake if thrusting
    if (this.shakeIntensity > 0.01) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
    }
  }
}