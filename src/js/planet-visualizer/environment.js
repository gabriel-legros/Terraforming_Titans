(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.updateOverlayText = function updateOverlayText() {
    const overlay = this.elements.overlay;
    if (!overlay) return;

    const colonists = resources.colony.colonists.value;
    const co2MassTon = resources.atmospheric.carbonDioxide.value;
    const g = currentPlanetParameters.celestialParameters.gravity;
    const radiusKm = currentPlanetParameters.celestialParameters.radius;

    const pa = calculateAtmosphericPressure(co2MassTon, g, radiusKm);
    const kPa = pa / 1000;

    const popText = formatNumber(colonists);
    const kPaText = (Math.abs(kPa) < 1000) ? kPa.toFixed(2) : kPa.toExponential(2);

    overlay.textContent = `Pop: ${popText}\nCO2: ${kPaText} kPa`;
  };

  PlanetVisualizer.prototype.createStarField = function createStarField() {
    const starCount = 1200;
    const radius = 60;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.starField = new THREE.Points(geometry, material);
    this.starField.renderOrder = -10;
    this.scene.add(this.starField);
  };

  PlanetVisualizer.prototype.createCityLights = function createCityLights() {
    if (!this.sphere) return;
    this.cityLightsGroup = new THREE.Group();
    this.sphere.add(this.cityLightsGroup);

    const geom = new THREE.SphereGeometry(0.005, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd37a });

    for (let i = 0; i < this.maxCityLights; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.005;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      const m = new THREE.Mesh(geom, mat.clone());
      m.position.set(x, y, z);
      m.visible = false;
      this.cityLightsGroup.add(m);
      this.cityLights.push(m);
    }
  };

  PlanetVisualizer.prototype.updateCityLights = function updateCityLights() {
    const pop = this.getCurrentPopulation();
    const target = Math.max(0, Math.min(this.maxCityLights, Math.floor((pop / 1_000_000) * this.maxCityLights)));
    this.lastCityLightCount = target;

    const sunDir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const tmp = new THREE.Vector3();

    for (let i = 0; i < this.maxCityLights; i++) {
      const m = this.cityLights[i];
      if (!m) continue;
      const baseVisible = i < target;
      if (!baseVisible) {
        m.visible = false;
        continue;
      }
      m.getWorldPosition(tmp);
      tmp.normalize();
      const daySide = tmp.dot(sunDir) > 0;
      m.visible = !daySide;
    }
  };
})();
