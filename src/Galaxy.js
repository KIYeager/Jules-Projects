import * as THREE from 'three';

// Standard stellar classification colors (O, B, A, F, G, K, M)
const stellarColors = [
  new THREE.Color(0x9db4ff), // O - Blue
  new THREE.Color(0xa2b9ff), // B - Blue-white
  new THREE.Color(0xffffff), // A - White
  new THREE.Color(0xfff4ea), // F - Yellow-white
  new THREE.Color(0xffd2a1), // G - Yellow
  new THREE.Color(0xffa351), // K - Orange
  new THREE.Color(0xff652b)  // M - Red
];

// Distribution probabilities for the stellar classes (making cooler stars more common)
const stellarProbabilities = [0.01, 0.05, 0.1, 0.2, 0.25, 0.2, 0.19];

function getRandomStellarColor() {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < stellarProbabilities.length; i++) {
    cumulative += stellarProbabilities[i];
    if (rand <= cumulative) {
      return stellarColors[i];
    }
  }
  return stellarColors[stellarColors.length - 1];
}

export class Galaxy {
  constructor(scene, numStars = 150000) {
    this.scene = scene;
    this.numStars = numStars;
    this.radius = 1000;
    this.branches = 4;
    this.spin = 1.5;
    this.randomness = 0.2;
    this.randomnessPower = 3;
    this.thickness = 100;

    this.points = null;
    this.generate();
  }

  generate() {
    if (this.points !== null) {
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.scene.remove(this.points);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.numStars * 3);
    const colors = new Float32Array(this.numStars * 3);

    const insideColor = new THREE.Color(0xffaa88); // Dense center core color

    for (let i = 0; i < this.numStars; i++) {
      const i3 = i * 3;

      // Distance from center
      // Use power to clump more stars near the center (galactic core)
      const radius = Math.random() * this.radius;
      const radiusPower = Math.pow(radius / this.radius, 0.5) * this.radius;

      // Angle for the branches (spiral arms)
      const branchAngle = ((i % this.branches) / this.branches) * Math.PI * 2;
      const spinAngle = radiusPower * (this.spin / this.radius);

      // Randomness spread around the branches
      const randomX = Math.pow(Math.random(), this.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.randomness * radiusPower;
      const randomY = Math.pow(Math.random(), this.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.randomness * radiusPower;
      const randomZ = Math.pow(Math.random(), this.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.randomness * radiusPower;

      // Y positioning (thickness of the galaxy disc)
      // Thicker near the center, thinning out towards the edges
      const distanceRatio = radiusPower / this.radius;
      const heightSpread = this.thickness * Math.exp(-distanceRatio * 5);
      const yPos = (Math.random() - 0.5) * heightSpread + randomY;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radiusPower + randomX;
      positions[i3 + 1] = yPos;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radiusPower + randomZ;

      // Colors
      const mixedColor = insideColor.clone();
      const starColor = getRandomStellarColor();
      // Core is distinct, arms use stellar class colors
      mixedColor.lerp(starColor, distanceRatio * 1.5);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material using custom shader for maximum performance and circular stars
    const material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: true,
      uniforms: {
        uSize: { value: 1.5 },
        uScale: { value: window.innerHeight * 0.5 }
      },
      vertexShader: `
        uniform float uSize;
        uniform float uScale;
        varying vec3 vColor;

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;

          gl_Position = projectedPosition;

          // Size attenuation
          gl_PointSize = uSize * uScale * (1.0 / -viewPosition.z);

          vColor = color;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Create circular star
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float strength = 0.05 / distanceToCenter - 0.1;

          gl_FragColor = vec4(vColor, strength);
        }
      `
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  update(delta) {
    // Optional: Slow rotation of the galaxy itself
    if (this.points) {
        this.points.rotation.y += 0.005 * delta;
    }
  }
}