(function () {
  class PlanetVisualizer {
    constructor() {
      // Cached UI elements
      this.elements = {
        container: null,
        overlay: null,
      };

      // three.js members
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.sphere = null;

      // Lighting and atmosphere
      this.sunLight = null;
      this.sunMesh = null;
      this.atmoMesh = null;
      this.atmoMaterial = null;

      // Environment visuals
      this.starField = null;
      this.cityLightsGroup = null;
      this.cityLights = [];
      this.maxCityLights = 200;
      this.lastCityLightCount = -1;

      // Spaceships
      this.shipCapacity = 1000;
      this.shipStates = [];
      this.shipHeads = null;
      this.shipTrails = null;
      this.shipHeadPositions = null;
      this.shipTrailPositions = null;
      this.shipTrailColors = null;

      // Animation helpers
      this._lastAnimTime = performance.now();
      this._spawnAcc = 0;
      this._spawnRate = 6;
      this._lastSliderSync = 0;

      // Render sizing
      this.width = 0;
      this.height = 0;
      this.planetAngle = 0;
      this.rotationSpeed = 0.01;
      this.cameraDistance = 3.5;
      this.cameraHeight = 0.0;

      // Surface caches
      this.lastCraterFactorKey = null;
      this.craterLayer = null;
      this.cloudLayer = null;
      this.waterMask = null;
      this.craterAlphaData = null;
      this.craterZoneHists = null;
      this.heightMap = null;
      this.heightZoneHists = null;

      // Cloud caches
      this.cloudMesh = null;
      this.cloudMaterial = null;
      this.cloudMap = null;
      this.cloudHist = null;
      this.cloudDrift = 0;
      this.cloudDriftSpeed = 0.005;

      this._zoneRowIndex = null;

      // Bind methods used as callbacks
      this.animate = this.animate.bind(this);
      this.onResize = this.onResize.bind(this);
      this.applySlidersToGame = this.applySlidersToGame.bind(this);
      this.syncSlidersFromGame = this.syncSlidersFromGame.bind(this);
      this.updateSliderValueLabels = this.updateSliderValueLabels.bind(this);
      this.refreshGameModeSliderDisplays = this.refreshGameModeSliderDisplays.bind(this);

      // Debug controls cache
      this.debug = {
        enabled: (function () {
          return !(window['debug_planet-visualizer'] === false);
        })(),
        container: null,
        rows: {},
        mode: 'game',
        modeSelect: null,
      };

      // Visualizer-local state (does not affect game)
      this.viz = {
        illum: 1,
        pop: 0,
        kpa: { co2: 0, o2: 0, inert: 0, h2o: 0, ch4: 0 },
        coverage: { water: 0, life: 0, cloud: 0 },
        zonalCoverage: {
          tropical: { water: 0, ice: 0, life: 0 },
          temperate: { water: 0, ice: 0, life: 0 },
          polar: { water: 0, ice: 0, life: 0 },
        },
        baseColor: '#8a2a2a',
        inclinationDeg: 15,
      };
    }

    get resources() {
      return (typeof window !== 'undefined' ? window.resources : null);
    }

    get terraforming() {
      if (typeof window === 'undefined') return null;
      return window.terraformingManager || window.terraforming || null;
    }

    normalizeHexColor(value) {
      if (typeof value !== 'string') return null;
      let hex = value.trim();
      if (!hex) return null;
      if (hex[0] !== '#') {
        if (/^[0-9a-fA-F]{6}$/.test(hex) || /^[0-9a-fA-F]{3}$/.test(hex)) {
          hex = `#${hex}`;
        } else {
          return null;
        }
      }
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return `#${hex.slice(1).toLowerCase()}`;
      }
      if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
        const r = hex[1];
        const g = hex[2];
        const b = hex[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
      }
      return null;
    }

    getGameBaseColor() {
      if (typeof currentPlanetParameters === 'undefined' || !currentPlanetParameters) return null;
      return currentPlanetParameters.visualization?.baseColor || null;
    }

    setBaseColor(color, opts = {}) {
      const normalized = this.normalizeHexColor(color)
        || this.normalizeHexColor(this.viz.baseColor)
        || '#8a2a2a';
      const prev = this.viz.baseColor;
      const changed = opts.force || prev !== normalized;
      this.viz.baseColor = normalized;
      if (changed) {
        this.lastCraterFactorKey = null;
        if (!opts.skipSurfaceUpdate) {
          this.updateSurfaceTextureFromPressure(true);
        }
      }

      const colorRow = this.debug?.rows?.baseColor;
      const shouldSyncControls = !opts.fromGame || this.debug.mode !== 'debug' || opts.force;
      if (colorRow && shouldSyncControls) {
        if (colorRow.color) colorRow.color.value = normalized;
        if (colorRow.text) colorRow.text.value = normalized.toUpperCase();
      }
      return normalized;
    }

    updateDebugControlState() {
      const isDebug = this.debug.mode === 'debug';
      const colorRow = this.debug?.rows?.baseColor;
      if (colorRow) {
        if (colorRow.color) colorRow.color.disabled = !isDebug;
        if (colorRow.text) colorRow.text.disabled = !isDebug;
      }
    }

    init() {
      const container = document.getElementById('planet-visualizer');
      const overlay = document.getElementById('planet-visualizer-overlay');
      this.elements.container = container;
      this.elements.overlay = overlay;

      this.width = container.clientWidth;
      this.height = container.clientHeight;
      if (!this.width || !this.height) {
        this.width = this.height = 320;
      }

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setSize(this.width, this.height);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.createStarField();
      this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
      this.camera.position.z = this.cameraDistance;
      this.camera.position.y = this.cameraHeight;
      this.camera.lookAt(0, 0, 0);

      const initialIllum = this.getGameIllumination();
      this.viz.illum = initialIllum;
      const baseColorFromGame = this.getGameBaseColor();
      if (baseColorFromGame) {
        this.setBaseColor(baseColorFromGame, { fromGame: true, force: true, skipSurfaceUpdate: true });
      } else {
        this.setBaseColor(this.viz.baseColor, { force: true, skipSurfaceUpdate: true });
      }
      this.sunLight = new THREE.DirectionalLight(0xffffff, initialIllum);
      this.sunLight.position.set(5, 3, 2);
      this.scene.add(this.sunLight);
      this.scene.add(new THREE.AmbientLight(0x404040));

      const sunGeom = new THREE.SphereGeometry(0.15, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5a6 });
      this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
      this.sunMesh.position.copy(this.sunLight.position).multiplyScalar(1.6);
      this.scene.add(this.sunMesh);
      this.updateSunFromInclination();

      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
      this.sphere = new THREE.Mesh(geometry, material);
      this.scene.add(this.sphere);

      this.createCityLights();
      this.createAtmosphere();
      this.createCloudSphere();
      this.createShipSystem();

      window.addEventListener('resize', this.onResize);

      if (this.debug.enabled) {
        this.buildDebugControls();
        this.syncSlidersFromGame();
      }

      this.updateOverlayText();
      this.updateSurfaceTextureFromPressure(true);
      this.updateCityLights();
      this.updateCloudUniforms();
      this.animate();
    }

    onResize() {
      if (!this.elements.container) return;
      const w = this.elements.container.clientWidth;
      const h = this.elements.container.clientHeight;
      if (w === 0 || h === 0) return;
      this.width = w;
      this.height = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    animate() {
      let angle;
      if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.getDayProgress === 'function') {
        const progress = dayNightCycle.getDayProgress();
        angle = (progress % 1) * Math.PI * 2;
      } else {
        this.planetAngle += this.rotationSpeed;
        angle = this.planetAngle;
      }
      this.planetAngle = angle;
      if (this.sphere) {
        this.sphere.rotation.y = angle;
      }
      if (this.cloudMesh) {
        const now = performance.now();
        if (!this._lastCloudTime) this._lastCloudTime = now;
        const dt = Math.min(0.05, (now - this._lastCloudTime) / 1000);
        this._lastCloudTime = now;
        this.cloudDrift = (this.cloudDrift || 0) + (this.cloudDriftSpeed || 0.005) * dt;
        this.cloudMesh.rotation.y = angle + this.cloudDrift;
      }
      const ang = angle;
      this.camera.position.set(
        Math.sin(ang) * this.cameraDistance,
        this.cameraHeight,
        Math.cos(ang) * this.cameraDistance
      );
      this.camera.lookAt(0, 0, 0);

      this.updateOverlayText();
      if (this.debug && this.debug.mode === 'game') {
        this.updateZonalCoverageFromGameSafe();
      }
      this.updateSurfaceTextureFromPressure();
      this.updateCityLights();
      this.updateAtmosphereUniforms();
      this.updateCloudUniforms();
      this.updateShips();

      if (this.debug && this.debug.mode === 'game' && this.debug.rows && this.debug.container) {
        const now = performance.now();
        if (now - this._lastSliderSync > 500) {
          this.syncSlidersFromGame();
          this._lastSliderSync = now;
        }
      }

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.animate);
    }

    updateZonalCoverageFromGameSafe() {
      try { this.updateZonalCoverageFromGame(); } catch (e) {}
    }

    updateZonalCoverageFromGame() {
      const t = terraforming;
      const zones = ['tropical', 'temperate', 'polar'];
      const z = this.viz.zonalCoverage;
      for (const zone of zones) {
        let w, i, b;
        if (t && t.zonalCoverageCache && t.zonalCoverageCache[zone]) {
          const c = t.zonalCoverageCache[zone];
          w = c.liquidWater; i = c.ice; b = c.biomass;
        } else {
          const area = (t.celestialParameters.surfaceArea || 0) * getZonePercentage(zone);
          const zw = t.zonalWater?.[zone] || {};
          const zs = t.zonalSurface?.[zone] || {};
          w = estimateCoverage(zw.liquid || 0, area, 0.0001);
          i = estimateCoverage(zw.ice || 0, area, 0.0001 * 100);
          b = estimateCoverage(zs.biomass || 0, area, 0.0001 * 100000);
        }
        z[zone].water = Math.max(0, Math.min(1, Number(w) || 0));
        z[zone].ice = Math.max(0, Math.min(1, Number(i) || 0));
        z[zone].life = Math.max(0, Math.min(1, Number(b) || 0));
      }
      const avg = (a, b, c) => (a + b + c) / 3;
      this.viz.coverage.water = avg(z.tropical.water, z.temperate.water, z.polar.water) * 100;
      this.viz.coverage.life = avg(z.tropical.life, z.temperate.life, z.polar.life) * 100;
    }

    getCurrentPopulation() {
      if (this.debug.mode === 'debug') {
        return this.viz.pop || 0;
      }
      return (resources?.colony?.colonists?.value) || 0;
    }

    getGameIllumination() {
      const flux = this.terraforming?.luminosity?.modifiedSolarFlux;
      if (typeof flux === 'number' && Number.isFinite(flux)) {
        return Math.max(0, flux) / 250;
      }
      if (typeof currentPlanetParameters !== 'undefined' && currentPlanetParameters?.celestialParameters) {
        const fallback = currentPlanetParameters.celestialParameters.starLuminosity;
        if (typeof fallback === 'number' && Number.isFinite(fallback)) {
          return fallback;
        }
      }
      return 1;
    }

    hashSeedFromPlanet() {
      const name = (currentPlanetParameters && currentPlanetParameters.name) || 'Planet';
      let h = 2166136261 >>> 0; for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
      const x = ((h & 0xffff) / 65535);
      const y = (((h >>> 16) & 0xffff) / 65535);
      return { x, y };
    }

    massFromPressureKPa(kPa, g, radiusKm) {
      const pPa = Math.max(0, kPa) * 1000;
      const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
      return (pPa * surfaceArea) / (1000 * g);
    }

    computeTotalPressureKPa() {
      if (this.debug.mode === 'debug') {
        const k = this.viz.kpa;
        return (k.co2 + k.o2 + k.inert + k.h2o + k.ch4);
      }
      const cel = currentPlanetParameters.celestialParameters;
      let totalPa = 0;
      const atm = resources.atmospheric || {};
      for (const key in atm) {
        const mass = atm[key]?.value || 0;
        totalPa += calculateAtmosphericPressure(mass, cel.gravity, cel.radius) || 0;
      }
      return totalPa / 1000;
    }
  }

  window.PlanetVisualizer = PlanetVisualizer;

  window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {
    window.planetVisualizer = new PlanetVisualizer();
    window.planetVisualizer.init();
  };
})();
