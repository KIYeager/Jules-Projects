import * as THREE from 'three';

export class SolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.celestialBodies = []; // Array of { mesh, radius } for collision detection
    this.planets = []; // Keep track of planets for orbit updates

    this.createSun();
    this.createPlanets();
  }

  createSun() {
    // 1. The Sun's Geometry and Material
    const sunRadius = 500;
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 64, 64);

    // We use a MeshBasicMaterial so it's fully emissive and unaffected by its own light
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.position.set(0, 0, 0);
    this.scene.add(this.sunMesh);

    // Track for collision
    this.celestialBodies.push({ mesh: this.sunMesh, radius: sunRadius, name: 'Sun' });

    // 2. The Sun's PointLight (Sole light source)
    this.sunLight = new THREE.PointLight(0xffffff, 2, 0, 0); // Color, intensity, distance, decay
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;

    // Optional: tweak shadow map settings for higher quality
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = sunRadius * 1.1; // Ensure near plane is outside the sun's surface
    this.sunLight.shadow.camera.far = 50000;

    this.scene.add(this.sunLight);
  }

  createPlanets() {
    // Distance scale: 1 unit = 1 million km (approx)
    // Size scale: 1 unit = 1000 km (approx, exaggerated for gameplay visibility)

    const planetData = [
      { name: 'Mercury', radius: 2.4, distance: 700, color: 0x888888, speed: 0.04 },
      { name: 'Venus', radius: 6.0, distance: 1000, color: 0xe3bb76, speed: 0.015 },
      { name: 'Earth', radius: 6.3, distance: 1500, color: 0x2233ff, speed: 0.01 },
      { name: 'Mars', radius: 3.3, distance: 2200, color: 0xc1440e, speed: 0.008 },
      { name: 'Jupiter', radius: 69.9, distance: 4000, color: 0xd39c7e, speed: 0.002 },
      { name: 'Saturn', radius: 58.2, distance: 7000, color: 0xead6b8, speed: 0.0009 },
      { name: 'Uranus', radius: 25.3, distance: 10000, color: 0xd1e7e7, speed: 0.0004 },
      { name: 'Neptune', radius: 24.6, distance: 15000, color: 0x5b5ddf, speed: 0.0001 }
    ];

    planetData.forEach(data => {
      // 1. Create a pivot for the orbit
      const orbitPivot = new THREE.Object3D();
      this.scene.add(orbitPivot);

      // 2. Create the planet mesh
      const geometry = new THREE.SphereGeometry(data.radius, 32, 32);

      // Use standard material with fallbacks for textures.
      // If we had texture maps, we would load them via TextureLoader and assign them to:
      // map, normalMap, and roughnessMap.
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.1
        // map: textureLoader.load('path/to/diffuse.jpg'),
        // normalMap: textureLoader.load('path/to/normal.jpg'),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(data.distance, 0, 0);
      mesh.receiveShadow = true;
      mesh.castShadow = true;

      orbitPivot.add(mesh);

      // Store reference
      this.planets.push({
        pivot: orbitPivot,
        mesh: mesh,
        speed: data.speed,
        rotationSpeed: 0.02 // self rotation
      });

      // Track for collision
      // World position needs to be calculated dynamically if checking collision,
      // but we can store the local offset and pivot
      this.celestialBodies.push({
        mesh: mesh,
        pivot: orbitPivot, // Needed to calculate world position later
        radius: data.radius,
        name: data.name
      });
    });

    // Add Earth's Moon
    const earthData = this.planets[2];
    const moonRadius = 1.7;
    const moonDistance = 20; // from Earth
    const moonGeo = new THREE.SphereGeometry(moonRadius, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(moonDistance, 0, 0);
    moonMesh.receiveShadow = true;
    moonMesh.castShadow = true;

    // Orbit pivot relative to Earth
    const moonOrbitPivot = new THREE.Object3D();
    moonOrbitPivot.add(moonMesh);
    earthData.mesh.add(moonOrbitPivot); // Add to Earth's mesh

    this.planets.push({
      pivot: moonOrbitPivot,
      mesh: moonMesh,
      speed: 0.05, // Orbit speed around Earth
      rotationSpeed: 0.01
    });

    // Push moon for collisions.
    // Note: Collision logic needs to use `mesh.getWorldPosition()` for nested objects
    this.celestialBodies.push({
      mesh: moonMesh,
      radius: moonRadius,
      name: 'Moon'
    });
  }

  update(delta) {
    // Basic rotation for the sun
    if (this.sunMesh) {
      this.sunMesh.rotation.y += 0.05 * delta;
    }

    // Update planetary orbits and rotations
    this.planets.forEach(planet => {
      // Orbit around parent
      planet.pivot.rotation.y += planet.speed * delta;
      // Rotation on its own axis
      planet.mesh.rotation.y += planet.rotationSpeed * delta;
    });
  }
}
