import * as THREE from 'three';

export class SolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.celestialBodies = [];
    this.createSystem();
  }

  createSystem() {
    // Distance scale: 1 unit = approx 1 million km (scaled for visual clarity)
    // Radius scale: scaled for visibility (e.g., Earth radius 6371km => 1 unit)

    // --- The Sun ---
    const sunGeometry = new THREE.SphereGeometry(109 / 10, 64, 64); // Scaled Sun
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.position.set(0, 0, 0);
    this.scene.add(this.sun);

    const sunLight = new THREE.PointLight(0xffffff, 5, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    this.sun.add(sunLight);

    // Planets: [name, orbit_distance, radius, color]
    const planetsData = [
      ['Mercury', 58, 0.38, 0xaaaaaa],
      ['Venus', 108, 0.95, 0xe3bb76],
      ['Earth', 150, 1.0, 0x2233ff],
      ['Mars', 228, 0.53, 0xff3300],
      ['Jupiter', 778, 11.2, 0xd39c7e],
      ['Saturn', 1427, 9.45, 0xc5ab6e],
      ['Uranus', 2871, 4.0, 0xbbe1e4],
      ['Neptune', 4495, 3.88, 0x6081ff]
    ];

    planetsData.forEach(([name, distance, radius, color]) => {
      const planetGeometry = new THREE.SphereGeometry(radius * 2, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.2,
        roughness: 0.6
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);

      const angle = Math.random() * Math.PI * 2;
      planet.position.set(distance * 1.5, 0, 0); // Scale distance slightly
      planet.receiveShadow = true;
      planet.castShadow = true;
      this.scene.add(planet);

      this.celestialBodies.push({
        name: name,
        mesh: planet,
        radius: radius * 2,
        orbitDistance: distance * 1.5,
        orbitSpeed: 0.1 / Math.sqrt(distance) // Kepler-ish
      });

      // Moons
      if (name === 'Earth') {
        this.addMoon(planet, 'Moon', 3.84, 0.27, 0x888888, 0.01);
      } else if (name === 'Jupiter') {
        this.addMoon(planet, 'Io', 4.2, 0.28, 0xffff00, 0.02);
        this.addMoon(planet, 'Europa', 6.7, 0.24, 0xeeeeee, 0.015);
        this.addMoon(planet, 'Ganymede', 10.7, 0.41, 0xaaaaaa, 0.01);
        this.addMoon(planet, 'Callisto', 18.8, 0.37, 0x888888, 0.008);
      } else if (name === 'Saturn') {
        this.addMoon(planet, 'Titan', 12.2, 0.40, 0xe3bb76, 0.01);

        // Saturn's Rings
        const ringGeo = new THREE.RingGeometry(radius * 2 * 1.5, radius * 2 * 3.0, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x888877,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.x = Math.PI / 2.5;
        planet.add(rings);
      }
    });

    this.celestialBodies.push({ name: 'Sun', mesh: this.sun, radius: sunGeometry.parameters.radius });
  }

  addMoon(parent, name, dist, radius, color, speed) {
    const moonGeo = new THREE.SphereGeometry(radius * 2, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: color });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(dist * 2.5, 0, 0);
    parent.add(moon);

    this.celestialBodies.push({
        name: name,
        mesh: moon,
        radius: radius * 2,
        isMoon: true,
        parent: parent,
        orbitDistance: dist * 2.5,
        orbitSpeed: speed
    });
  }

  update(delta) {
    this.celestialBodies.forEach(body => {
      if (body.orbitDistance && !body.isMoon) {
        const time = Date.now() * 0.0005;
        body.mesh.position.x = Math.cos(time * body.orbitSpeed) * body.orbitDistance;
        body.mesh.position.z = Math.sin(time * body.orbitSpeed) * body.orbitDistance;
        body.mesh.rotation.y += 0.005;
      } else if (body.isMoon) {
        const time = Date.now() * 0.0005;
        body.mesh.position.x = Math.cos(time * body.orbitSpeed * 10) * body.orbitDistance;
        body.mesh.position.z = Math.sin(time * body.orbitSpeed * 10) * body.orbitDistance;
        body.mesh.rotation.y += 0.01;
      }
    });
  }
}
