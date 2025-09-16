// Planet Visualizer
// Lightweight wrapper around three.js to show a simple red sphere
// and overlay planet data from the running game.

(function () {
  class PlanetVisualizer {
    constructor() {
      // Access game globals via getters; do not cache references
      // to avoid stale objects after planet travel/load

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
      this.sunLight = null;
      this.sunMesh = null;
      this.atmoMesh = null;
      this.atmoMaterial = null;
      this.starField = null;
      this.cityLightsGroup = null;
      this.cityLights = [];
      this.maxCityLights = 200; // Total available city lights
      this.lastCityLightCount = -1;
      // Ships (points + line trails)
      this.shipCapacity = 1000;
      this.shipStates = [];
      this.shipHeads = null;
      this.shipTrails = null;
      this.shipHeadPositions = null;
      this.shipTrailPositions = null;
      this.shipTrailColors = null;
      this._lastAnimTime = performance.now();
      this._spawnAcc = 0; // accumulator for continuous spawning
      this._spawnRate = 6; // ships per second when below target
      this._lastSliderSync = 0; // throttle game-mode slider syncing

      // Render sizing
      this.width = 0;
      this.height = 0;
      this.planetAngle = 0;       // radians
      this.rotationSpeed = 0.01;  // fallback when no dayNightCycle
      this.cameraDistance = 3.5;  // distance from planet center
      this.cameraHeight = 0.0;    // equatorial geosynchronous view
      this.lastCraterFactorKey = null; // memoize texture state
      this.craterLayer = null;    // cached crater alpha/color layer (static shape)
      this.cloudLayer = null;     // cached green cloud layer (static shape)
      this.waterMask = null;      // cached water mask (grayscale FBM) for oceans (legacy)
      this.craterAlphaData = null;   // per-pixel crater alpha (legacy water fill)
      this.craterZoneHists = null;   // histograms of crater alpha per zone (legacy)
      this.heightMap = null;         // per-pixel elevation 0..1
      this.heightZoneHists = null;   // histograms of height per zone
      this.cloudMap = null;          // per-pixel cloud noise 0..1
      this.cloudHist = null;         // histogram of cloud noise (for coverage quantiles)
      this._zoneRowIndex = null;     // cached row->zone index mapping (0=trop,1=temp,2=polar)

      // Bind methods
      this.animate = this.animate.bind(this);
      this.onResize = this.onResize.bind(this);
      this.applySlidersToGame = this.applySlidersToGame.bind(this);
      this.syncSlidersFromGame = this.syncSlidersFromGame.bind(this);
      this.updateSliderValueLabels = this.updateSliderValueLabels.bind(this);
      this.refreshGameModeSliderDisplays = this.refreshGameModeSliderDisplays.bind(this);

      // Debug controls cache
  this.debug = {
    enabled: (function() {
      // Default true unless explicitly false
      return !(window['debug_planet-visualizer'] === false);
    })(),
    container: null,
    rows: {}, // id -> { range, number }
    mode: 'game', // 'game' | 'debug'
    modeSelect: null,
  };

      // Visualizer-local state (does not affect game)
      this.viz = {
        illum: 1,
        pop: 0,
        kpa: { co2: 0, o2: 0, inert: 0, h2o: 0, ch4: 0 },
        coverage: { water: 0, life: 0, cloud: 0 },
        // Fractions per zone in [0,1]
        zonalCoverage: {
          tropical: { water: 0, ice: 0, life: 0 },
          temperate: { water: 0, ice: 0, life: 0 },
          polar: { water: 0, ice: 0, life: 0 }
        },
        baseColor: '#8a2a2a',
        inclinationDeg: 15,
      };
    }

    // Always read fresh globals
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
      // Cache DOM elements once
      const container = document.getElementById('planet-visualizer');
      const overlay = document.getElementById('planet-visualizer-overlay');
      this.elements.container = container;
      this.elements.overlay = overlay;

      // Setup three.js
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      if (!this.width || !this.height) {
        // Fallback size if tab is hidden or not yet laid out; will correct on next resize
        this.width = this.height = 320;
      }

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setSize(this.width, this.height);
      this.renderer.setClearColor(0x000000, 1);
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      // Faint background stars
      this.createStarField();
      this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
      this.camera.position.z = this.cameraDistance;
      this.camera.position.y = this.cameraHeight;
      this.camera.lookAt(0, 0, 0);

      // Sun (directional) + a small visible marker sphere
      const initialIllum = this.getGameIllumination();
      this.viz.illum = initialIllum;
      const baseColorFromGame = this.getGameBaseColor();
      if (baseColorFromGame) {
        this.setBaseColor(baseColorFromGame, { fromGame: true, force: true, skipSurfaceUpdate: true });
      } else {
        this.setBaseColor(this.viz.baseColor, { force: true, skipSurfaceUpdate: true });
      }
      this.sunLight = new THREE.DirectionalLight(0xffffff, initialIllum);
      this.sunLight.position.set(5, 3, 2); // direction toward the planet
      this.scene.add(this.sunLight);
      this.scene.add(new THREE.AmbientLight(0x404040));

      const sunGeom = new THREE.SphereGeometry(0.15, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5a6 }); // emissive-looking
      this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
      this.sunMesh.position.copy(this.sunLight.position).multiplyScalar(1.6);
      this.scene.add(this.sunMesh);
      // Apply current inclination setting to sun position
      this.updateSunFromInclination();

      const geometry = new THREE.SphereGeometry(1, 32, 32);
      // Use neutral base color so the texture drives appearance
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
      this.sphere = new THREE.Mesh(geometry, material);
      this.scene.add(this.sphere);

      // Pre-create a pool of tiny city lights attached to the planet
      this.createCityLights();

      // Atmosphere shell (single scattering approximation)
      this.createAtmosphere();
      // Cloud sphere (textured overlay above terrain)
      this.createCloudSphere();
      // Spaceship particles
      this.createShipSystem();

      window.addEventListener('resize', this.onResize);

      if (this.debug.enabled) {
        this.buildDebugControls();
        this.syncSlidersFromGame();
      }

      this.updateOverlayText();
      // Create initial crater texture matching current pressure
      this.updateSurfaceTextureFromPressure(true);
      // Ensure lights match initial population
      this.updateCityLights();
      // Initialize cloud uniforms from current coverage
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
      // Planet rotation + geosynchronous camera orbit
      let angle;
      if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.getDayProgress === 'function') {
        const progress = dayNightCycle.getDayProgress(); // 0..1 over a day
        angle = (progress % 1) * Math.PI * 2;
      } else {
        // Fallback: simple constant spin if cycle unavailable
        this.planetAngle += this.rotationSpeed;
        angle = this.planetAngle;
      }
      this.planetAngle = angle;
      if (this.sphere) {
        this.sphere.rotation.y = angle;
      }
      // Ensure cloud shell rotates with a gentle additional drift so it moves relative to terrain
      if (this.cloudMesh) {
        const now = performance.now();
        if (!this._lastCloudTime) this._lastCloudTime = now;
        const dt = Math.min(0.05, (now - this._lastCloudTime) / 1000);
        this._lastCloudTime = now;
        this.cloudDrift = (this.cloudDrift || 0) + (this.cloudDriftSpeed || 0.005) * dt; // rad/s slow drift
        this.cloudMesh.rotation.y = angle + this.cloudDrift;
      }
      // Camera follows the same angular position (geostationary)
      const ang = angle;
      this.camera.position.set(
        Math.sin(ang) * this.cameraDistance,
        this.cameraHeight,
        Math.cos(ang) * this.cameraDistance
      );
      this.camera.lookAt(0, 0, 0);

      // Keep overlay up to date
      this.updateOverlayText();
      // In game-driven mode, sync zonal coverages from terraforming state
      if (this.debug && this.debug.mode === 'game') {
        this.updateZonalCoverageFromGameSafe();
      }
      // Update crater appearance if total pressure changed meaningfully
      this.updateSurfaceTextureFromPressure();
      // Adjust city lights based on population
      this.updateCityLights();
      // Update atmosphere uniforms (pressure, sun dir, tint)
      this.updateAtmosphereUniforms();
      // Update cloud shader uniforms (no relative rotation)
      this.updateCloudUniforms();
      // Update ships
      this.updateShips();

      // If the debug panel is in Game-driven mode, keep sliders reflecting live game
      if (this.debug && this.debug.mode === 'game' && this.debug.rows && this.debug.container) {
        const now = performance.now();
        if (now - this._lastSliderSync > 500) { // sync twice per second
          // Use the fuller sync to catch all values and input pairs
          this.syncSlidersFromGame();
          this._lastSliderSync = now;
        }
      }

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.animate);
    }

    updateOverlayText() {
      const overlay = this.elements.overlay;
      if (!overlay) return;

      // Population from resources
      const colonists = resources.colony.colonists.value;

      // CO2 pressure from atmospheric CO2 mass and current world params
      const co2MassTon = resources.atmospheric.carbonDioxide.value;
      // Read static body params from current planet parameters to avoid
      // depending on terraforming initialization timing
      const g = currentPlanetParameters.celestialParameters.gravity;
      const radiusKm = currentPlanetParameters.celestialParameters.radius;

      // calculateAtmosphericPressure expects tons, m/s^2, and radius in km
      const pa = calculateAtmosphericPressure(co2MassTon, g, radiusKm);
      const kPa = pa / 1000;

      const popText = formatNumber(colonists);

      // Show two decimals for kPa without formatNumber to keep it clear
      const kPaText = (Math.abs(kPa) < 1000) ? kPa.toFixed(2) : kPa.toExponential(2);

      overlay.textContent = `Pop: ${popText}\nCO2: ${kPaText} kPa`;
    }

    // Pull current zonal coverage fractions (0..1) from the live terraforming state
    updateZonalCoverageFromGameSafe() {
      try { this.updateZonalCoverageFromGame(); } catch(e) { /* ignore to avoid UI disruption */ }
    }

    updateZonalCoverageFromGame() {
      const t = terraforming;
      const zones = ['tropical','temperate','polar'];
      const z = this.viz.zonalCoverage;
      for (const zone of zones) {
        let w, i, b;
        if (t && t.zonalCoverageCache && t.zonalCoverageCache[zone]) {
          const c = t.zonalCoverageCache[zone];
          w = c.liquidWater; i = c.ice; b = c.biomass;
        } else {
          // Fallback: compute from zonal amounts with same scales used in terraforming.js
          const area = (t.celestialParameters.surfaceArea || 0) * getZonePercentage(zone);
          const zw = t.zonalWater?.[zone] || {};
          const zs = t.zonalSurface?.[zone] || {};
          w = estimateCoverage(zw.liquid || 0, area, 0.0001);
          i = estimateCoverage(zw.ice || 0, area, 0.0001 * 100);
          b = estimateCoverage(zs.biomass || 0, area, 0.0001 * 100000);
        }
        z[zone].water = Math.max(0, Math.min(1, Number(w) || 0));
        z[zone].ice   = Math.max(0, Math.min(1, Number(i) || 0));
        z[zone].life  = Math.max(0, Math.min(1, Number(b) || 0));
      }
      // Update global averages used for tinting/clouds
      const avg = (a,b,c)=> (a+b+c)/3;
      this.viz.coverage.water = avg(z.tropical.water, z.temperate.water, z.polar.water) * 100;
      this.viz.coverage.life  = avg(z.tropical.life,  z.temperate.life,  z.polar.life)  * 100;
    }

    // ---------- Debug UI ----------
  buildDebugControls() {
    const host = document.createElement('div');
    host.className = 'planet-visualizer-debug';

    const grid = document.createElement('div');
    grid.className = 'pv-grid';
    host.appendChild(grid);

      const makeRow = (id, label, min, max, step) => {
        const l = document.createElement('div');
        l.className = 'pv-row-label';
        l.textContent = label;
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(min); range.max = String(max); range.step = String(step);
        range.id = `pv-${id}`;
        const valWrap = document.createElement('div');
        valWrap.className = 'pv-row-value';
        const number = document.createElement('input');
        number.type = 'number';
        number.min = String(min); number.max = String(max); number.step = String(step);
        valWrap.appendChild(number);
        grid.appendChild(l); grid.appendChild(range); grid.appendChild(valWrap);
        this.debug.rows[id] = { range, number };
        const syncFromRange = () => { number.value = range.value; this.applySlidersToGame(); };
        const syncFromNumber = () => { range.value = number.value; this.applySlidersToGame(); };
        range.addEventListener('input', syncFromRange);
        number.addEventListener('input', syncFromNumber);
      };

      // Illumination (star luminosity multiplier)
      makeRow('illum', 'Illumination', 0.0, 3.0, 0.01);
      // Planet inclination (sun elevation)
      makeRow('incl', 'Inclination (deg)', -90, 90, 1);
      // Population (colonists)
      makeRow('pop', 'Population', 0, 1000000, 1);
      // Spaceship visualizer count
      makeRow('ships', 'Spaceships', 0, 1000, 1);
      // Gas pressures (kPa) – clamped to 0..100
      makeRow('co2', 'CO2 (kPa)', 0, 100, 0.1);
      makeRow('o2',  'O2 (kPa)',  0, 100, 0.1);
      makeRow('inert','Inert (kPa)', 0, 100, 0.1);
      makeRow('h2o', 'H2O vap. (kPa)', 0, 100, 0.1);
      makeRow('ch4', 'CH4 (kPa)', 0, 100, 0.1);

      // Zonal coverage sliders (percent)
      // Water by zone
      makeRow('wTrop', 'Water Trop (%)', 0, 100, 0.1);
      makeRow('wTemp', 'Water Temp (%)', 0, 100, 0.1);
      makeRow('wPol',  'Water Polar (%)', 0, 100, 0.1);
      // Ice by zone
      makeRow('iTrop', 'Ice Trop (%)', 0, 100, 0.1);
      makeRow('iTemp', 'Ice Temp (%)', 0, 100, 0.1);
      makeRow('iPol',  'Ice Polar (%)', 0, 100, 0.1);
      // Biomass by zone
      makeRow('bTrop', 'Biomass Trop (%)', 0, 100, 0.1);
      makeRow('bTemp', 'Biomass Temp (%)', 0, 100, 0.1);
      makeRow('bPol',  'Biomass Polar (%)', 0, 100, 0.1);
      // Clouds (global visual only)
      makeRow('cloudCov', 'Clouds (%)', 0, 100, 0.1);

      const baseColorLabel = document.createElement('div');
      baseColorLabel.className = 'pv-row-label';
      baseColorLabel.textContent = 'Base color';
      const baseColorInput = document.createElement('input');
      baseColorInput.type = 'color';
      baseColorInput.id = 'pv-baseColor';
      const baseColorHex = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
      baseColorInput.value = baseColorHex;
      const baseColorValue = document.createElement('div');
      baseColorValue.className = 'pv-row-value';
      const baseColorText = document.createElement('input');
      baseColorText.type = 'text';
      baseColorText.value = baseColorHex.toUpperCase();
      baseColorText.maxLength = 7;
      baseColorText.pattern = '#[0-9a-fA-F]{6}';
      baseColorText.spellcheck = false;
      baseColorText.placeholder = '#RRGGBB';
      baseColorText.autocomplete = 'off';
      baseColorValue.appendChild(baseColorText);
      grid.appendChild(baseColorLabel);
      grid.appendChild(baseColorInput);
      grid.appendChild(baseColorValue);
      this.debug.rows.baseColor = { color: baseColorInput, text: baseColorText };

      const syncBaseColorInputs = (hex) => {
        const normalized = this.normalizeHexColor(hex) || this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
        if (baseColorInput) baseColorInput.value = normalized;
        if (baseColorText) baseColorText.value = normalized.toUpperCase();
        return normalized;
      };

      baseColorInput.addEventListener('input', () => {
        if (this.debug.mode !== 'debug') {
          syncBaseColorInputs(this.viz.baseColor);
          return;
        }
        const normalized = syncBaseColorInputs(baseColorInput.value);
        if (normalized) {
          this.setBaseColor(normalized);
        }
      });

      baseColorText.addEventListener('change', () => {
        if (this.debug.mode !== 'debug') {
          syncBaseColorInputs(this.viz.baseColor);
          return;
        }
        const normalized = this.normalizeHexColor(baseColorText.value);
        if (!normalized) {
          syncBaseColorInputs(this.viz.baseColor);
          return;
        }
        syncBaseColorInputs(normalized);
        this.setBaseColor(normalized);
      });

    const controls = document.createElement('div');
    controls.className = 'pv-controls';
    const label = document.createElement('label');
    label.textContent = 'Mode:';
    label.style.marginRight = '6px';
    const select = document.createElement('select');
    const optGame = document.createElement('option'); optGame.value = 'game'; optGame.textContent = 'Game-driven';
    const optDebug = document.createElement('option'); optDebug.value = 'debug'; optDebug.textContent = 'Slider debug';
    select.appendChild(optGame);
    select.appendChild(optDebug);
    select.value = this.debug.mode;
    select.addEventListener('change', () => {
      this.debug.mode = select.value;
      if (this.debug.mode === 'game') {
        this.syncSlidersFromGame();
      }
      if (this.debug.mode === 'game') {
        this.setBaseColor(this.getGameBaseColor(), { fromGame: true });
      } else {
        syncBaseColorInputs(this.viz.baseColor);
      }
      this.updateDebugControlState();
    });
    controls.appendChild(label);
    controls.appendChild(select);
    host.appendChild(controls);
    this.debug.modeSelect = select;

    // Place debug panel directly after the canvas container
    this.updateDebugControlState();
    this.elements.container.insertAdjacentElement('afterend', host);
    this.debug.container = host;
  }

    updateSliderValueLabels() {
      const r = this.debug.rows; if (!r) return;
      const setVal = (id, v) => { if (r[id]) r[id].number.value = String(v); if (r[id]) r[id].range.value = String(v); };
      setVal('illum', Number(r.illum.range.value));
      setVal('pop',   Number(r.pop.range.value));
      if (r.incl) setVal('incl',  Number(r.incl.range.value));
      setVal('ships', Number(r.ships.range.value));
      setVal('co2',   Number(r.co2.range.value));
      setVal('o2',    Number(r.o2.range.value));
      setVal('inert', Number(r.inert.range.value));
      setVal('h2o',   Number(r.h2o.range.value));
      setVal('ch4',   Number(r.ch4.range.value));
      // Cloud (global)
      setVal('cloudCov', Number(r.cloudCov?.range?.value || 0));
      // Zonal sliders
      const sv = (id) => { if (r[id]) setVal(id, Number(r[id].range.value)); };
      ['wTrop','wTemp','wPol','iTrop','iTemp','iPol','bTrop','bTemp','bPol'].forEach(sv);
    }

    // ---------- City lights ----------
    createCityLights() {
      if (!this.sphere) return;
      this.cityLightsGroup = new THREE.Group();
      this.sphere.add(this.cityLightsGroup);

      const geom = new THREE.SphereGeometry(0.005, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd37a }); // warm city light

      // Generate deterministic positions for stability across frames
      for (let i = 0; i < this.maxCityLights; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;           // longitude
        const phi = Math.acos(2 * v - 1);        // latitude from +Z
        const r = 1.005;                         // slightly above surface
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        const m = new THREE.Mesh(geom, mat.clone());
        m.position.set(x, y, z);
        m.visible = false;
        this.cityLightsGroup.add(m);
        this.cityLights.push(m);
      }
    }

    // ---------- Atmosphere ----------
    createAtmosphere() {
      const atmoRadius = 1.03; // slightly larger than planet
      const geo = new THREE.SphereGeometry(atmoRadius, 48, 32);
      const uniforms = {
        sunDir: { value: new THREE.Vector3(1, 0, 0) },
        cameraPos: { value: new THREE.Vector3() },
        rayleigh: { value: 1.0 },
        mie: { value: 0.02 },
        mieG: { value: 0.76 },
        pRatio: { value: 0.0 }, // 0..1 pressure ratio (kPa/100)
        tint: { value: new THREE.Color(0x6fa8ff) },
      };
      const vtx = `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `;
      const frag = `
        precision mediump float;
        varying vec3 vWorldPos;
        uniform vec3 sunDir;
        uniform vec3 cameraPos;
        uniform float rayleigh;
        uniform float mie;
        uniform float mieG;
        uniform float pRatio;
        uniform vec3 tint;

        const float PI = 3.14159265359;

        float rayleighPhase(float cosTheta){
          return 3.0/(16.0*PI) * (1.0 + cosTheta*cosTheta);
        }
        float hgPhase(float cosTheta, float g){
          float g2 = g*g;
          return 3.0/(8.0*PI) * (1.0 - g2) * (1.0 + cosTheta*cosTheta) / pow(1.0 + g2 - 2.0*g*cosTheta, 1.5);
        }

        void main(){
          // Normal from planet center (assumes planet at origin)
          vec3 N = normalize(vWorldPos);
          vec3 V = normalize(cameraPos - vWorldPos);
          float mu = clamp(dot(N, normalize(sunDir)), -1.0, 1.0); // sun zenith
          float cosTheta = clamp(dot(V, normalize(sunDir)), -1.0, 1.0);

          // Simple height/edge factor to enhance limb
          float viewN = clamp(1.0 - dot(N, V), 0.0, 1.0);

          float Fr = rayleighPhase(mu);
          float Fm = hgPhase(mu, mieG);

          // Day-side only contribution
          float day = max(0.0, mu);

          // Pressure scaling
          float pr = clamp(pRatio, 0.0, 1.2);

          vec3 col = tint * (rayleigh * Fr * 0.9 + mie * Fm * 0.1);
          col *= day * viewN * (0.15 + 1.35 * pr);

          gl_FragColor = vec4(col, clamp(0.02 + 0.98*pr, 0.0, 1.0));
        }
      `;
      this.atmoMaterial = new THREE.ShaderMaterial({
        vertexShader: vtx,
        fragmentShader: frag,
        uniforms,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.atmoMesh = new THREE.Mesh(geo, this.atmoMaterial);
      this.scene.add(this.atmoMesh);
    }

  updateAtmosphereUniforms() {
      if (!this.atmoMaterial) return;
      // Pressure ratio from kPa (visualizer when debug enabled)
      const kPa = this.computeTotalPressureKPa();
      const pr = Math.max(0, Math.min(1, kPa / 100));
      const u = this.atmoMaterial.uniforms;
      u.pRatio.value = pr;
      // Tie strengths to pressure
      u.rayleigh.value = 1.0 * (0.2 + 0.8 * pr);
      u.mie.value = 0.02 * (0.1 + 0.9 * pr);
      // Sun direction
      const dir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1,0,0);
      u.sunDir.value.copy(dir);
      // Camera position
      u.cameraPos.value.copy(this.camera.position);
      // Tint from water coverage (more blue with water)
      const water = (this.viz.coverage?.water || 0) / 100;
      const base = new THREE.Color(0x7aa6ff); // blue
      const dry = new THREE.Color(0xd7a37a);  // dry dusty
      const mix = dry.clone().lerp(base, water);
      u.tint.value.copy(mix);
    }

    // Update sun (directional light and marker) based on inclination angle in degrees
    updateSunFromInclination() {
      if (!this.sunLight) return;
      const deg = (this.viz?.inclinationDeg ?? 15);
      const elev = deg * Math.PI / 180; // elevation from equator
      // Keep fixed azimuth based on initial xz ratio (5:2)
      const az = Math.atan2(2, 5);
      const r = 6.0; // visual distance
      const x = r * Math.cos(elev) * Math.cos(az);
      const y = r * Math.sin(elev);
      const z = r * Math.cos(elev) * Math.sin(az);
      this.sunLight.position.set(x, y, z);
      if (this.sunMesh) this.sunMesh.position.copy(this.sunLight.position).multiplyScalar(1.6);
    }

    // --- Cloud sphere helpers ---
    createStarField() {
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
    }
    createCloudSphere() {
      const cloudRadius = 1.022; // slightly above surface
      const geo = new THREE.SphereGeometry(cloudRadius, 64, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0, // let the texture alpha fully control opacity; 255 => fully white
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
        side: THREE.FrontSide,
      });
      this.cloudMaterial = mat;
      this.cloudMesh = new THREE.Mesh(geo, mat);
      this.cloudMesh.renderOrder = 5;
      this.scene.add(this.cloudMesh);
      // Build initial cloud texture
      this.updateCloudMeshTexture();
    }

    updateCloudMeshTexture() {
      const w = 512, h = 256;
      if (!this.cloudMap || !this.cloudHist || this.cloudMap.length !== w * h) {
        this.generateCloudMap(w, h);
      }
      // Build threshold from current coverage percent
      const cloudPct = Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0));
      const total = this.cloudHist.total || (w * h);
      const target = Math.round((cloudPct / 100) * total);
      let thr = -1;
      if (target > 0) {
        let acc = 0; for (let k = 0; k <= 255; k++) { acc += this.cloudHist.counts[k]; if (acc >= target) { thr = k; break; } }
      }
      const canv = document.createElement('canvas');
      canv.width = w; canv.height = h;
      const ctx = canv.getContext('2d');
      const img = ctx.createImageData(w, h);
      const data = img.data;
      for (let i = 0; i < w * h; i++) {
        const v = Math.max(0, Math.min(1, this.cloudMap[i] || 0));
        const bin = Math.max(0, Math.min(255, Math.floor(v * 255)));
        const on = (thr >= 0) ? (bin <= thr) : false;
        const idx = i * 4;
        data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = on ? 225 : 0; // 75% opacity
      }
      ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(canv);
      if (THREE && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
      this.cloudMaterial.map = tex;
      this.cloudMaterial.needsUpdate = true;
      this._lastCloudCoverageKey = `${cloudPct.toFixed(2)}`;
    }

    // ---------- Spaceship particle system ----------
    createShipSystem() {
      const cap = this.shipCapacity;
      // Heads (points)
      this.shipHeadPositions = new Float32Array(cap * 3);
      const headGeo = new THREE.BufferGeometry();
      headGeo.setAttribute('position', new THREE.BufferAttribute(this.shipHeadPositions, 3));
      const headMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false });
      this.shipHeads = new THREE.Points(headGeo, headMat);
      this.scene.add(this.shipHeads);

      // Trails (line segments)
      this.shipTrailPositions = new Float32Array(cap * 2 * 3);
      this.shipTrailColors = new Float32Array(cap * 2 * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(this.shipTrailPositions, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(this.shipTrailColors, 3));
      const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
      this.shipTrails = new THREE.LineSegments(trailGeo, trailMat);
      this.scene.add(this.shipTrails);
    }

    spawnShip() {
      // Start near equator with random longitude; choose an orbit inclination up to ±15° for some ships
      const lon = Math.random() * Math.PI * 2;
      const inc = (Math.random() < 0.35 ? (Math.random() * 2 - 1) * (Math.PI / 12) : 0); // up to ±15°
      const node = Math.random() * Math.PI * 2; // ascending node
      const axis = new THREE.Vector3(Math.cos(node), 0, Math.sin(node));
      const r0 = 1.005;
      // Base equatorial position then incline progressively during launch
      const base = new THREE.Vector3(Math.cos(lon) * r0, 0, Math.sin(lon) * r0);
      const q = new THREE.Quaternion().setFromAxisAngle(axis, inc * 0.0);
      const pos = base.clone().applyQuaternion(q);
      const eastEq = new THREE.Vector3(-Math.sin(lon), 0, Math.cos(lon)).normalize();
      const east = eastEq.clone().applyQuaternion(q);
      const normal = pos.clone().normalize();
      const vel = east.clone().multiplyScalar(-0.015).add(normal.clone().multiplyScalar(0.004));
      this.shipStates.push({
        phase: 0,
        t: 0,
        pos,
        vel,
        angle: lon,
        radius: r0,
        orbitRadius: 1.04 + Math.random() * 0.03,
        inc,
        node,
        axis,
        colorHead: new THREE.Color(1.0, 0.75, 0.3),
        colorTail: new THREE.Color(1.0, 0.55, 0.2),
        trail: 0.10
      });
    }

    sphericalToCartesian(r, lat, lon) {
      const x = r * Math.cos(lat) * Math.cos(lon);
      const y = r * Math.sin(lat);
      const z = r * Math.cos(lat) * Math.sin(lon);
      return new THREE.Vector3(x, y, z);
    }

    updateShips() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this._lastAnimTime) / 1000);
      this._lastAnimTime = now;
      const target = Math.max(0, Math.min(this.shipCapacity, Math.floor(this.viz?.ships || 0)));
      // Continuous spawning toward target
      if (this.shipStates.length < target) {
        // speed up spawn if far from target
        const missing = target - this.shipStates.length;
        const rate = Math.min(20, this._spawnRate + missing * 0.2);
        this._spawnAcc += rate * dt;
        while (this._spawnAcc >= 1 && this.shipStates.length < target) {
          this.spawnShip();
          this._spawnAcc -= 1;
        }
      } else {
        // if target reduced, trim gradually by forcing oldest to depart fast
        if (this.shipStates.length > target) {
          this.shipStates.length = target;
        }
        this._spawnAcc = 0;
      }

      const headPos = this.shipHeadPositions;
      const trailPos = this.shipTrailPositions;
      const trailCol = this.shipTrailColors;
      const K_LAUNCH = 0.22;
      const OMEGA_L = -3.2; // reversed
      const OMEGA_O = -1.8; // reversed
      const ACCEL_D = 0.35;
      const sunDir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1,0,0);
      const q = new THREE.Quaternion();
      const basePos = new THREE.Vector3();
      const baseTan = new THREE.Vector3();

      for (let i = 0; i < this.shipStates.length; i++) {
        const s = this.shipStates[i];
        s.t += dt;
        if (s.phase === 0) {
          s.radius = s.radius * Math.exp(K_LAUNCH * dt);
          s.angle += OMEGA_L * dt;
          // Progressive inclination during launch
          const prog = Math.min(1, (s.radius - 1.005) / Math.max(0.001, (s.orbitRadius - 1.005)));
          q.setFromAxisAngle(s.axis, s.inc * prog);
          basePos.set(Math.cos(s.angle) * s.radius, 0, Math.sin(s.angle) * s.radius);
          s.pos.copy(basePos).applyQuaternion(q);
          s.trail = 0.10;
          s.colorHead.setRGB(1.0, 0.8, 0.3);
          s.colorTail.setRGB(1.0, 0.6, 0.25);
          if (s.radius >= s.orbitRadius) { s.phase = 1; s.t = 0; }
        } else if (s.phase === 1) {
          s.angle += OMEGA_O * dt;
          q.setFromAxisAngle(s.axis, s.inc);
          basePos.set(Math.cos(s.angle) * s.orbitRadius, 0, Math.sin(s.angle) * s.orbitRadius);
          s.pos.copy(basePos).applyQuaternion(q);
          s.trail = 0.06;
          s.colorHead.setRGB(1.0, 1.0, 1.0);
          s.colorTail.setRGB(0.8, 0.9, 1.0);
          if (s.t > (2.5 + Math.random() * 2.0)) { s.phase = 2; s.t = 0; s.departSpeed = Math.abs(s.orbitRadius * OMEGA_O); }
        } else {
          // Departure: leave tangentially from inclined orbit, then pitch outward
          q.setFromAxisAngle(s.axis, s.inc);
          baseTan.set(Math.sin(s.angle), 0, -Math.cos(s.angle)).normalize();
          const tangent = baseTan.clone().applyQuaternion(q);
          // Radial outward from planet center
          const outward = s.pos.clone().normalize();
          // Blend factor increases over a couple seconds: 0 => pure tangent, 1 => mostly outward
          const alpha = Math.min(1, s.t / 2.0);
          const dir = tangent.multiplyScalar(1.0 - 0.2 * alpha) // keep some tangential component
            .add(outward.multiplyScalar(0.2 + 0.8 * alpha))
            .normalize();
          const speed = Math.max(0, s.departSpeed || Math.abs(s.orbitRadius * OMEGA_O));
          s.pos.addScaledVector(dir, speed * dt);
          s.trail = (0.10 + 0.22 * Math.min(1, s.t / 3)) / 3; // 3x shorter trails on departure
          s.colorHead.setRGB(0.9, 0.95, 1.0);
          s.colorTail.setRGB(0.6, 0.8, 1.0);
          if (s.pos.length() > 20) { this.shipStates[i] = null; continue; }
        }

        // Write to buffers
        const head = s.pos;
        let trailDir;
        if (s.phase === 2) {
          q.setFromAxisAngle(s.axis, s.inc);
          baseTan.set(Math.sin(s.angle), 0, -Math.cos(s.angle)).normalize();
          const tangent = baseTan.clone().applyQuaternion(q);
          const outward = s.pos.clone().normalize();
          const alpha = Math.min(1, s.t / 2.0);
          trailDir = tangent.multiplyScalar(1.0 - 0.2 * alpha).add(outward.multiplyScalar(0.2 + 0.8 * alpha)).normalize();
        } else {
          q.setFromAxisAngle(s.axis, Math.min(s.inc, s.inc));
          baseTan.set(Math.sin(s.angle), 0, -Math.cos(s.angle)).normalize();
          trailDir = baseTan.clone().applyQuaternion(q);
        }
        const tail = head.clone().addScaledVector(trailDir, -s.trail);
        const hp = i * 3;
        headPos[hp] = head.x; headPos[hp + 1] = head.y; headPos[hp + 2] = head.z;
        const tp = i * 6;
        trailPos[tp] = head.x; trailPos[tp + 1] = head.y; trailPos[tp + 2] = head.z;
        trailPos[tp + 3] = tail.x; trailPos[tp + 4] = tail.y; trailPos[tp + 5] = tail.z;
        trailCol[tp] = s.colorHead.r; trailCol[tp + 1] = s.colorHead.g; trailCol[tp + 2] = s.colorHead.b;
        trailCol[tp + 3] = s.colorTail.r * 0.5; trailCol[tp + 4] = s.colorTail.g * 0.5; trailCol[tp + 5] = s.colorTail.b * 0.5;
      }

      if (this.shipStates.includes(null)) this.shipStates = this.shipStates.filter(Boolean);

      const n = this.shipStates.length;
      if (this.shipHeads) {
        this.shipHeads.geometry.setDrawRange(0, n);
        this.shipHeads.geometry.attributes.position.needsUpdate = true;
      }
      if (this.shipTrails) {
        this.shipTrails.geometry.setDrawRange(0, n * 2);
        this.shipTrails.geometry.attributes.position.needsUpdate = true;
        this.shipTrails.geometry.attributes.color.needsUpdate = true;
      }
    }

    generateCloudCanvas() {
      // Persistent, gradually evolving cloud field for the canvas path (fallback/legacy)
      // Initial random constants are generated once; subsequent calls nudge them slightly.
      const w = 1024, h = 512;
      // Init persistent canvas + state once
      if (!this._cloudCanvas) {
        this._cloudCanvas = document.createElement('canvas');
        this._cloudCanvas.width = w;
        this._cloudCanvas.height = h;
      }
      const canvas = this._cloudCanvas;
      const ctx = canvas.getContext('2d');

      // Initialize blob field with deterministic seed per planet
      if (!this._cloudBlobState) {
        const seed = this.hashSeedFromPlanet();
        // Simple LCG for reproducible randomness
        let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
        const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
        const blobs = 900;
        const items = [];
        for (let i = 0; i < blobs; i++) {
          const x = rand() * w;
          const y = rand() * h;
          const r = 8 + rand() * 40;
          const a = 0.15 + rand() * 0.15;
          // Tiny velocities so pattern evolves over a few days
          const dx = (rand() - 0.5) * 5.4;  // pixels per day
          const dy = (rand() - 0.5) * 2.7;
          const dr = (rand() - 0.5) * 3;
          items.push({ x, y, r, a, dx, dy, dr });
        }
        this._cloudBlobState = { items, lastDays: 0 };
      }

      // Compute elapsed in-game days since last draw
      let days = 0;
      if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.dayDuration === 'number') {
        days = (dayNightCycle.elapsedTime || 0) / Math.max(1, dayNightCycle.dayDuration);
      } else {
        days = (performance.now() / 1000) / 60; // ~1 day per minute fallback
      }
      const state = this._cloudBlobState;
      const deltaDays = Math.max(0, Math.min(0.2, days - (state.lastDays || 0))); // clamp to avoid big jumps
      state.lastDays = days;

      // Evolve field slightly
      const items = state.items;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it.x = (it.x + it.dx * deltaDays + w) % w;
        it.y = (it.y + it.dy * deltaDays + h) % h;
        it.r = Math.max(6, Math.min(50, it.r + it.dr * deltaDays));
      }

      // Redraw current field
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r);
        g.addColorStop(0, `rgba(255,255,255,${it.a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
      }
      return canvas;
    }

    updateCloudTexture(force = false) {
      if (!this.cloudMesh || !this.cloudMaterial) return;
      const cov = Math.max(0, Math.min(1, (this.viz.coverage?.cloud || 0) / 100));
      // Generate the cloud map once and then keep it stable; only opacity changes
      if (!this.cloudMaterial.map) {
        const canvas = this.generateCloudCanvas();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        this.cloudMaterial.map = tex;
        this.cloudMaterial.needsUpdate = true;
      }
      this.cloudMaterial.opacity = 0.2 + 0.8 * cov;
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

    updateCityLights() {
      const pop = this.getCurrentPopulation();
      const target = Math.max(0, Math.min(this.maxCityLights, Math.floor((pop / 1_000_000) * this.maxCityLights)));
      // We still iterate each frame to evaluate day/night culling even if target unchanged
      this.lastCityLightCount = target;

      // Direction from planet center to the sun (world space)
      const sunDir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1,0,0);
      const tmp = new THREE.Vector3();

      for (let i = 0; i < this.maxCityLights; i++) {
        const m = this.cityLights[i];
        if (!m) continue;
        // Desired base visibility from population count
        const baseVisible = i < target;
        if (!baseVisible) { m.visible = false; continue; }
        // Compute world-space normal for this point
        m.getWorldPosition(tmp);
        tmp.normalize(); // since planet at origin
        const daySide = tmp.dot(sunDir) > 0; // facing the sun
        m.visible = !daySide; // lights only on the night side
      }
    }

    hashSeedFromPlanet(){
      const name = (currentPlanetParameters && currentPlanetParameters.name) || 'Planet';
      let h = 2166136261>>>0; for(let i=0;i<name.length;i++){ h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
      const x = ((h & 0xffff) / 65535);
      const y = (((h>>>16) & 0xffff) / 65535);
      return { x, y };
    }

    updateCloudUniforms(){
      // Keep cloud shell visible and update its map when coverage changes
      if (this.cloudMesh) this.cloudMesh.visible = true;
      if (this.cloudMesh && this.cloudMaterial) {
        const keyNow = `${Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0)).toFixed(2)}`;
        if (this._lastCloudCoverageKey !== keyNow) {
          this.updateCloudMeshTexture();
        }
      }
    }

    // Convert pressure (kPa) -> mass (tons) using same physics as pressure calc
    massFromPressureKPa(kPa, g, radiusKm) {
      const pPa = Math.max(0, kPa) * 1000;
      const surfaceArea = 4 * Math.PI * Math.pow(radiusKm * 1000, 2);
      return (pPa * surfaceArea) / (1000 * g);
    }

    applySlidersToGame() {
      this.updateSliderValueLabels();
      const r = this.debug.rows;
      const cel = currentPlanetParameters.celestialParameters;

      const clampFrom = (pair) => {
        const n = pair.number; const range = pair.range;
        let v = Number(n.value);
        const min = Number(n.min); const max = Number(n.max);
        if (isNaN(v)) v = min;
        if (!isNaN(min)) v = Math.max(min, v);
        if (!isNaN(max)) v = Math.min(max, v);
        n.value = String(v); range.value = String(v);
        return v;
      };

      // Illumination (visualizer only)
      const illum = clampFrom(r.illum);
      this.viz.illum = illum;
      // Inclination (degrees)
      if (r.incl) {
        this.viz.inclinationDeg = clampFrom(r.incl);
        this.updateSunFromInclination();
      }
      if (this.sunLight) this.sunLight.intensity = illum;

      // Population (visualizer only)
      const pop = Math.max(0, Math.floor(clampFrom(r.pop)));
      this.viz.pop = pop;

      // Spaceships
      this.viz.ships = Math.max(0, Math.floor(clampFrom(r.ships)));

      // Gas pressures (visualizer only, store as kPa)
      this.viz.kpa.co2   = clampFrom(r.co2);
      this.viz.kpa.o2    = clampFrom(r.o2);
      this.viz.kpa.inert = clampFrom(r.inert);
      this.viz.kpa.h2o   = clampFrom(r.h2o);
      this.viz.kpa.ch4   = clampFrom(r.ch4);

      // Zonal coverage sliders (visual only, store as fractions 0..1)
      const z = this.viz.zonalCoverage;
      const wT = clampFrom(r.wTrop) / 100, wM = clampFrom(r.wTemp) / 100, wP = clampFrom(r.wPol) / 100;
      const iT = clampFrom(r.iTrop) / 100, iM = clampFrom(r.iTemp) / 100, iP = clampFrom(r.iPol) / 100;
      const bT = clampFrom(r.bTrop) / 100, bM = clampFrom(r.bTemp) / 100, bP = clampFrom(r.bPol) / 100;
      z.tropical.water = wT; z.temperate.water = wM; z.polar.water = wP;
      z.tropical.ice   = iT; z.temperate.ice   = iM; z.polar.ice   = iP;
      z.tropical.life  = bT; z.temperate.life  = bM; z.polar.life  = bP;
      // Derive global coverage as a simple average for tinting and clouds
      this.viz.coverage.water = ((wT + wM + wP) / 3) * 100;
      this.viz.coverage.life  = ((bT + bM + bP) / 3) * 100;
      if (r.cloudCov) this.viz.coverage.cloud = clampFrom(r.cloudCov);

      // Surface should reflect pressure immediately
      this.updateSurfaceTextureFromPressure(true);
      // Refresh cloud uniforms immediately
      this.updateCloudUniforms();
    }

    // Read game state and set sliders accordingly
    syncSlidersFromGame() {
      const r = this.debug.rows;
      const cel = currentPlanetParameters.celestialParameters;

      // Illumination
      const illum = this.getGameIllumination();
      r.illum.range.value = String(illum);
      r.illum.number.value = String(illum);
      // Inclination sync from local viz (default 15 deg)
      if (r.incl) {
        const inc = (this.viz?.inclinationDeg ?? 15);
        r.incl.range.value = String(inc);
        r.incl.number.value = String(inc);
      }
      // Population
      const popNow = resources.colony.colonists.value || 0;
      r.pop.range.value = String(popNow);
      r.pop.number.value = String(popNow);
      // Spaceships (sync from game if available, otherwise visual state)
      const shipVal = (resources?.special?.spaceships?.value) ?? (this.viz.ships || 0);
      if (r.ships) { r.ships.range.value = String(shipVal); r.ships.number.value = String(shipVal); }

      const toKPa = (massTon) => calculateAtmosphericPressure(massTon || 0, cel.gravity, cel.radius) / 1000;
      const clamp100 = (v) => Math.max(0, Math.min(100, v));
      const atm = resources.atmospheric;
      r.co2.range.value   = String(clamp100(toKPa(atm.carbonDioxide.value)));
      r.o2.range.value    = String(clamp100(toKPa(atm.oxygen.value)));
      r.inert.range.value = String(clamp100(toKPa(atm.inertGas.value)));
      r.h2o.range.value   = String(clamp100(toKPa(atm.atmosphericWater.value)));
      r.ch4.range.value   = String(clamp100(toKPa(atm.atmosphericMethane.value)));
      r.co2.number.value   = r.co2.range.value;
      r.o2.number.value    = r.o2.range.value;
      r.inert.number.value = r.inert.range.value;
      r.h2o.number.value   = r.h2o.range.value;
      r.ch4.number.value   = r.ch4.range.value;

      // Coverage from terraforming (zonal fractions -> percent)
      // Pull latest into visualizer state first
      this.updateZonalCoverageFromGameSafe();
      const z = this.viz.zonalCoverage;
      const fmt = (v) => String((Math.max(0, Math.min(1, v)) * 100).toFixed(2));
      // Water (zonal)
      if (r.wTrop) { const s = fmt(z.tropical.water);  r.wTrop.range.value = s; r.wTrop.number.value = s; }
      if (r.wTemp) { const s = fmt(z.temperate.water); r.wTemp.range.value = s; r.wTemp.number.value = s; }
      if (r.wPol)  { const s = fmt(z.polar.water);     r.wPol.range.value  = s; r.wPol.number.value  = s; }
      // Ice
      if (r.iTrop) { const s = fmt(z.tropical.ice);    r.iTrop.range.value = s; r.iTrop.number.value = s; }
      if (r.iTemp) { const s = fmt(z.temperate.ice);   r.iTemp.range.value = s; r.iTemp.number.value = s; }
      if (r.iPol)  { const s = fmt(z.polar.ice);       r.iPol.range.value  = s; r.iPol.number.value  = s; }
      // Biomass
      if (r.bTrop) { const s = fmt(z.tropical.life);   r.bTrop.range.value = s; r.bTrop.number.value = s; }
      if (r.bTemp) { const s = fmt(z.temperate.life);  r.bTemp.range.value = s; r.bTemp.number.value = s; }
      if (r.bPol)  { const s = fmt(z.polar.life);      r.bPol.range.value  = s; r.bPol.number.value  = s; }
      // Set clouds initially equal to average water (user can change)
      const avgWater = ((z.tropical.water + z.temperate.water + z.polar.water) / 3) * 100;
      if (r.cloudCov) {
        const s = String(avgWater.toFixed(2));
        r.cloudCov.range.value = s; r.cloudCov.number.value = s;
      }

      const colorRow = this.debug.rows.baseColor;
      if (colorRow && this.debug.mode !== 'debug') {
        const normalized = this.normalizeHexColor(this.getGameBaseColor() || this.viz.baseColor) || '#8a2a2a';
        if (colorRow.color) colorRow.color.value = normalized;
        if (colorRow.text) colorRow.text.value = normalized.toUpperCase();
      }

      this.updateSliderValueLabels();
      // Update visualizer-local state and visuals (no game mutation)
      this.viz.illum = illum;
      this.viz.pop = popNow;
      this.viz.kpa = {
        co2: Number(r.co2.range.value),
        o2: Number(r.o2.range.value),
        inert: Number(r.inert.range.value),
        h2o: Number(r.h2o.range.value),
        ch4: Number(r.ch4.range.value),
      };
      // Update visualizer-local averages from live zonal values
      const avg = (a,b,c)=> (a+b+c)/3;
      this.viz.coverage = {
        water: avg(z.tropical.water, z.temperate.water, z.polar.water) * 100,
        life:  avg(z.tropical.life,  z.temperate.life,  z.polar.life)  * 100,
        cloud: Number(r.cloudCov ? r.cloudCov.range.value : avgWater),
      };
      this.viz.ships = Number(r.ships ? r.ships.range.value : 0);
      if (this.sunLight) this.sunLight.intensity = this.viz.illum;
      this.updateSurfaceTextureFromPressure(true);
      this.updateCloudUniforms();
    }

    // ---------- Crater texture generation ----------
    computeTotalPressureKPa() {
        // In debug mode, use slider-set kPa; otherwise use actual game resources
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
      return totalPa / 1000; // kPa
    }

    // Update debug sliders to mirror current game state without mutating visuals
    refreshGameModeSliderDisplays() {
      if (!this.debug || !this.debug.rows) return;
      const r = this.debug.rows;
      try {
        const cel = currentPlanetParameters.celestialParameters;
        // Illumination
        const illum = this.getGameIllumination();
        if (r.illum) { r.illum.range.value = String(illum); r.illum.number.value = String(illum); }
        // Population
        const popNow = resources?.colony?.colonists?.value || 0;
        if (r.pop) { r.pop.range.value = String(popNow); r.pop.number.value = String(popNow); }
        // Spaceships (best-effort)
        const shipVal = (resources?.special?.spaceships?.value) ?? (this.viz.ships || 0);
        if (r.ships) { r.ships.range.value = String(shipVal); r.ships.number.value = String(shipVal); }
        // Gas kPa from mass
        const toKPa = (massTon) => (calculateAtmosphericPressure(massTon || 0, cel.gravity, cel.radius) / 1000);
        const clamp100 = (v) => Math.max(0, Math.min(100, v));
        const atm = resources?.atmospheric || {};
        const setPair = (key, val) => { if (r[key]) { const s = String(clamp100(val)); r[key].range.value = s; r[key].number.value = s; } };
        setPair('co2', toKPa(atm.carbonDioxide?.value));
        setPair('o2', toKPa(atm.oxygen?.value));
        setPair('inert', toKPa(atm.inertGas?.value));
        setPair('h2o', toKPa(atm.atmosphericWater?.value));
        setPair('ch4', toKPa(atm.atmosphericMethane?.value));
        // Coverage mirrors live game zonals
        this.updateZonalCoverageFromGameSafe();
        const setPct = (pair, v) => { if (pair) { const s = String(Math.max(0, Math.min(100, v))); pair.range.value = s; pair.number.value = s; } };
        const zc = this.viz.zonalCoverage || {};
        setPct(r.wTrop, (zc.tropical?.water || 0) * 100);
        setPct(r.wTemp, (zc.temperate?.water || 0) * 100);
        setPct(r.wPol,  (zc.polar?.water || 0) * 100);
        setPct(r.iTrop, (zc.tropical?.ice || 0) * 100);
        setPct(r.iTemp, (zc.temperate?.ice || 0) * 100);
        setPct(r.iPol,  (zc.polar?.ice || 0) * 100);
        setPct(r.bTrop, (zc.tropical?.life || 0) * 100);
        setPct(r.bTemp, (zc.temperate?.life || 0) * 100);
        setPct(r.bPol,  (zc.polar?.life || 0) * 100);
        if (r.cloudCov) setPct(r.cloudCov, this.viz.coverage?.cloud || 0);
      } catch (e) {
        // Ignore display sync errors; do not disrupt rendering
      }
    }

    updateSurfaceTextureFromPressure(force = false) {
      const kPa = this.computeTotalPressureKPa();
      // 0 kPa -> 1 (full craters), 100 kPa+ -> 0 (few craters)
      const factor = Math.max(0, Math.min(1, 1 - (kPa / 100)));
      const water = (this.viz.coverage?.water || 0) / 100;
      const life = (this.viz.coverage?.life || 0) / 100;
      const cloud = (this.viz.coverage?.cloud || 0) / 100;
      // Memo key rounded to 2 decimals to avoid churn; include zonal coverage and base color
      const z = this.viz.zonalCoverage || {};
      const zKey = ['tropical','temperate','polar']
        .map(k=>`${(z[k]?.water??0).toFixed(2)}_${(z[k]?.ice??0).toFixed(2)}_${(z[k]?.life??0).toFixed(2)}`)
        .join('|');
      const baseColorKey = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
      const key = `${factor.toFixed(2)}|${water.toFixed(2)}|${life.toFixed(2)}|${cloud.toFixed(2)}|${zKey}|${baseColorKey}`;
      if (!force && key === this.lastCraterFactorKey) return;
      this.lastCraterFactorKey = key;

      const tex = this.generateCraterTexture(factor);
      if (this.sphere && this.sphere.material) {
        this.sphere.material.map = tex;
        this.sphere.material.needsUpdate = true;
      }
    }

    generateCraterTexture(strength) {
      // strength in [0,1]: 1 = very cratered, 0 = smooth
      const w = 512, h = 256;

      // Build crater layer once with fixed random distribution
      if (!this.craterLayer) {
        const craterCanvas = document.createElement('canvas');
        craterCanvas.width = w; craterCanvas.height = h;
        const cctx = craterCanvas.getContext('2d');
        // Build at maximum detail (strength = 1) and keep as overlay
        const maxCount = Math.floor(250 * 1 + 50);
        // Draw and also accumulate per-pixel alpha for later zonal water filling
        for (let i = 0; i < maxCount; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const r = (4 + Math.random() * 18) * (0.5 + 1);
          // Outer dark rim (alpha baked into layer)
          const g1 = cctx.createRadialGradient(x, y, r * 0.6, x, y, r);
          g1.addColorStop(0, 'rgba(0,0,0,0)');
          g1.addColorStop(1, 'rgba(0,0,0,0.25)');
          cctx.fillStyle = g1;
          cctx.beginPath();
          cctx.arc(x, y, r, 0, Math.PI * 2);
          cctx.fill();

          // Inner lighter floor
          const g2 = cctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
          g2.addColorStop(0, 'rgba(255,255,255,0.08)');
          g2.addColorStop(1, 'rgba(255,255,255,0)');
          cctx.fillStyle = g2;
          cctx.beginPath();
          cctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
          cctx.fill();
        }
        this.craterLayer = craterCanvas;
        // Cache crater alpha and per-zone histograms
        const img = cctx.getImageData(0, 0, w, h);
        const data = img.data;
        this.craterAlphaData = new Float32Array(w * h);
        // Map each row to a zone index once
        const zoneForV = (v) => {
          const latRad = (0.5 - v) * Math.PI; // 0..1 -> lat
          const absDeg = Math.abs(latRad * (180/Math.PI));
          if (absDeg >= 66.5) return 2; // polar
          if (absDeg >= 23.5) return 1; // temperate
          return 0; // tropical
        };
        this._zoneRowIndex = new Uint8Array(h);
        for (let y = 0; y < h; y++) {
          this._zoneRowIndex[y] = zoneForV(y / (h - 1));
        }
        // Build histograms of crater alpha per zone for fill thresholds
        this.craterZoneHists = {
          0: { counts: new Uint32Array(256), total: 0 }, // tropical
          1: { counts: new Uint32Array(256), total: 0 }, // temperate
          2: { counts: new Uint32Array(256), total: 0 }, // polar
        };
        for (let i = 0; i < w * h; i++) {
          const a = data[i * 4 + 3] / 255; // alpha 0..1
          this.craterAlphaData[i] = a;
          if (a > 0) {
            const y = Math.floor(i / w);
            const zi = this._zoneRowIndex[y];
            const bin = Math.max(0, Math.min(255, Math.floor(a * 255)));
            this.craterZoneHists[zi].counts[bin]++;
            this.craterZoneHists[zi].total++;
          }
        }
      }

      // Compose base + craterLayer scaled by strength (no change of shape)
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Water coverage: draw true oceans using a stable mask
      // Helper to mix two hex colors
      const mix = (a, b, t) => {
        const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
        const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
        const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
        const r = Math.round(ar + (br - ar) * t);
        const g = Math.round(ag + (bg - ag) * t);
        const b2 = Math.round(ab + (bb - ab) * t);
        return `rgb(${r},${g},${b2})`;
      };
      const waterT = (this.viz.coverage?.water || 0) / 100;
      // Base terrain stays dry colors; oceans will be overlaid above
      const baseHex = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
      const topCol = mix(baseHex, '#ffffff', 0.2);
      const botCol = mix(baseHex, '#000000', 0.35);
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, topCol);
      base.addColorStop(1, botCol);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      if (strength > 0) {
        ctx.globalAlpha = Math.max(0, Math.min(1, strength));
        ctx.drawImage(this.craterLayer, 0, 0);
        ctx.globalAlpha = 1;
      }

      // Terrain height tinting for relief
      if (!this.heightMap) this.generateHeightMap(w, h);
      try {
        const timg = ctx.getImageData(0, 0, w, h);
        const tdata = timg.data;
        for (let i = 0; i < w * h; i++) {
          const hgt = this.heightMap ? this.heightMap[i] : 0.5;
          // Lighten highlands, darken lowlands
          const f = 0.85 + 0.3 * Math.pow(hgt, 1.2);
          const idx = i * 4;
          tdata[idx]   = Math.min(255, Math.floor(tdata[idx]   * f));
          tdata[idx+1] = Math.min(255, Math.floor(tdata[idx+1] * f));
          tdata[idx+2] = Math.min(255, Math.floor(tdata[idx+2] * f));
        }
        ctx.putImageData(timg, 0, 0);
      } catch (e) {
        // ignore tint failures
      }

      // Ensure height map and histograms exist for ocean flooding by quantiles
      if (!this.heightMap || !this.heightZoneHists || !this._zoneRowIndex) {
        // Build row->zone map if missing
        if (!this._zoneRowIndex) {
          const zoneForV = (v) => {
            const latRad = (0.5 - v) * Math.PI; // 0..1 -> lat
            const absDeg = Math.abs(latRad * (180/Math.PI));
            if (absDeg >= 66.5) return 2; // polar
            if (absDeg >= 23.5) return 1; // temperate
            return 0; // tropical
          };
          this._zoneRowIndex = new Uint8Array(h);
          for (let y = 0; y < h; y++) this._zoneRowIndex[y] = zoneForV(y / (h - 1));
        }
        // Generate heightmap and zone histograms
        if (!this.heightMap) this.generateHeightMap(w, h);
      }

      // ----- Water overlay per zone using height quantiles -----
      const ocean = document.createElement('canvas');
      ocean.width = w; ocean.height = h;
      const octx = ocean.getContext('2d');
      const oimg = octx.createImageData(w, h);
      const odata = oimg.data;
      // Determine per-zone thresholds to match coverage fraction
      const zc = this.viz.zonalCoverage || {};
      const covW = [
        Math.max(0, Math.min(1, (zc.tropical?.water ?? 0)) ),
        Math.max(0, Math.min(1, (zc.temperate?.water ?? 0)) ),
        Math.max(0, Math.min(1, (zc.polar?.water ?? 0)) ),
      ];
      const thrIdx = [0,0,0];
      for (let zi = 0; zi < 3; zi++) {
        const hist = this.heightZoneHists?.[zi];
        if (!hist || hist.total === 0) { thrIdx[zi] = -1; continue; }
        const target = Math.max(0, Math.min(1, covW[zi])) * hist.total;
        if (target <= 0) { thrIdx[zi] = -1; continue; }
        let acc = 0; let k;
        for (k = 0; k <= 255; k++) {
          acc += hist.counts[k];
          if (acc >= target) break;
        }
        thrIdx[zi] = k; // pixels with height bin <= k become water
      }
      // Paint per pixel (water fully opaque to avoid green/ground showing through)
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
        const thr = thrIdx[zi];
        let a = 0;
        if (thr >= 0) {
          const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
          if (hbin <= thr) {
            a = 1.0; // fully cover biomass/terrain where water exists
          }
        }
        const idx = i * 4;
        const r = 10, g = 40, b = 120;
        odata[idx] = r;
        odata[idx + 1] = g;
        odata[idx + 2] = b;
        odata[idx + 3] = Math.floor(a * 255);
      }
      octx.putImageData(oimg, 0, 0);
      ctx.drawImage(ocean, 0, 0);

      // ----- Ice overlay (above oceans/terrain) -----
      const iceCanvas = document.createElement('canvas');
      iceCanvas.width = w; iceCanvas.height = h;
      const ictx = iceCanvas.getContext('2d');
      const iimg = ictx.createImageData(w, h);
      const idata = iimg.data;
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0; // 0=trop,1=temp,2=polar
        const iceFrac = [
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.tropical?.ice || 0))),
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.temperate?.ice || 0))),
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.polar?.ice || 0))),
        ][zi];
        const waterFrac = [
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.tropical?.water || 0))),
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.temperate?.water || 0))),
          Math.max(0, Math.min(1, (this.viz.zonalCoverage.polar?.water || 0))),
        ][zi];
        const land = Math.max(0, 1 - waterFrac);
        const idx = i * 4;
        const r = 200, g = 220, b = 255;
        idata[idx] = r;
        idata[idx + 1] = g;
        idata[idx + 2] = b;
        idata[idx + 3] = Math.floor(Math.max(0, Math.min(1, iceFrac * land)) * 255);
      }
      ictx.putImageData(iimg, 0, 0);
      ctx.drawImage(iceCanvas, 0, 0);

      // Clouds now render on a dedicated shell above terrain; do not draw onto base texture
      // Ensure the cloud shell texture reflects current coverage
      if (this.cloudMesh && this.cloudMaterial) {
        const keyNow = `${Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0)).toFixed(2)}`;
        if (this._lastCloudCoverageKey !== keyNow) {
          this.updateCloudMeshTexture();
        }
      }

      // Biomass overlay: even spread per zone; never draw over water. At 100% be fully opaque.
      const bAny = (this.viz.zonalCoverage.tropical.life + this.viz.zonalCoverage.temperate.life + this.viz.zonalCoverage.polar.life) > 0;
      if (bAny) {
        const bioCanvas = document.createElement('canvas');
        bioCanvas.width = w; bioCanvas.height = h;
        const bctx = bioCanvas.getContext('2d');
        const bimg = bctx.createImageData(w, h);
        const bdata = bimg.data;
        for (let i = 0; i < w * h; i++) {
          const y = Math.floor(i / w);
          const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
          const lifeFrac = [
            Math.max(0, Math.min(1, (this.viz.zonalCoverage.tropical?.life || 0))),
            Math.max(0, Math.min(1, (this.viz.zonalCoverage.temperate?.life || 0))),
            Math.max(0, Math.min(1, (this.viz.zonalCoverage.polar?.life || 0))),
          ][zi];
          // Skip biomass over water using the same zonal water thresholds computed above
          const thr = thrIdx[zi];
          if (thr >= 0) {
            const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
            if (hbin <= thr) {
              // Water takes precedence: do not draw biomass here
              continue;
            }
          }
          const idx = i * 4;
          const r = 30, g = 160, b = 80;
          bdata[idx] = r;
          bdata[idx + 1] = g;
          bdata[idx + 2] = b;
          // Fully opaque at 100%; otherwise semi-transparent proportional to coverage
          const alpha = (lifeFrac >= 1) ? 255 : Math.floor(Math.max(0, Math.min(1, lifeFrac)) * 200);
          bdata[idx + 3] = alpha;
        }
        bctx.putImageData(bimg, 0, 0);
        ctx.drawImage(bioCanvas, 0, 0);
      }

      const texture = new THREE.CanvasTexture(canvas);
      if (THREE && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      return texture;
    }

    // Build a stable FBM-based water mask (0..1) once per planet
    generateWaterMask(w, h) {
      const seed = this.hashSeedFromPlanet();
      let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
      const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
      const hash = (x, y) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.0001) * 43758.5453;
        return n - Math.floor(n);
      };
      const noise2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y) => {
        let f = 0, amp = 0.5, freq = 1.0;
        for (let o = 0; o < 5; o++) { f += amp * noise2(x * freq, y * freq); freq *= 2; amp *= 0.5; }
        return f;
      };
      const scale = 3.0; // controls size of continents
      const arr = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x / w) * scale;
          const ny = (y / h) * (scale * 0.5);
          let v = fbm(nx, ny);
          // Bias to produce meaningful land/ocean separation
          v = Math.min(1, Math.max(0, v));
          arr[y * w + x] = v;
        }
      }
      return arr;
    }

    // Procedural heightmap with continents and mountains; caches per-zone histograms
    generateHeightMap(w, h) {
      const seed = this.hashSeedFromPlanet();
      let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
      const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
      const hash = (x, y) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.00013) * 43758.5453;
        return n - Math.floor(n);
      };
      const lerp = (a,b,t) => a + (b - a) * t;
      const smooth = (t) => t * t * (3 - 2 * t);
      const value2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return lerp(lerp(a, b, u), lerp(c, d, u), v);
      };
      const fbm = (x, y, oct = 5, lac = 2.0, gain = 0.5) => {
        let f = 0, amp = 0.5, freq = 1.0;
        for (let o = 0; o < oct; o++) { f += amp * value2(x * freq, y * freq); freq *= lac; amp *= gain; }
        return f;
      };
      const ridged = (x, y, oct = 5, lac = 2.0, gain = 0.5) => {
        let f = 0, amp = 0.5, freq = 1.5;
        for (let o = 0; o < oct; o++) {
          const n = value2(x * freq, y * freq);
          const r = 1.0 - Math.abs(2 * n - 1); // triangle-shaped ridges
          f += amp * (r * r);
          freq *= lac; amp *= gain;
        }
        return f;
      };

      // Domain warp to break up symmetry
      const scaleBase = 1.6; // continents
      const scaleWarp = 0.8;
      const scaleRidge = 7.0; // mountains
      const arr = new Float32Array(w * h);
      let minH = Infinity, maxH = -Infinity;
      for (let y = 0; y < h; y++) {
        const vy = y / h;
        for (let x = 0; x < w; x++) {
          const vx = x / w;
          // warp coords
          const wx = fbm(vx * scaleWarp + 11.3, vy * scaleWarp + 5.7);
          const wy = fbm(vx * scaleWarp - 7.2, vy * scaleWarp - 3.9);
          const ux = vx * scaleBase + (wx - 0.5) * 0.8;
          const uy = vy * scaleBase + (wy - 0.5) * 0.4;
          const cont = fbm(ux, uy, 5, 2.0, 0.5);      // continents
          const mont = ridged(ux * scaleRidge, uy * scaleRidge, 5, 2.0, 0.5); // mountains
          let hgt = cont * 0.75 + mont * 0.5 - 0.25;
          // Latitudinal subtle bias: slightly more land near mid-lats
          const lat = Math.abs(0.5 - vy) * 2; // 0 at equator, 1 at poles
          hgt += (0.15 * (0.5 - Math.abs(lat - 0.5))); // bump around temperate
          minH = Math.min(minH, hgt); maxH = Math.max(maxH, hgt);
          arr[y * w + x] = hgt;
        }
      }
      // Normalize to 0..1
      const span = Math.max(1e-6, (maxH - minH));
      for (let i = 0; i < w * h; i++) arr[i] = (arr[i] - minH) / span;
      this.heightMap = arr;

      // Build zone mapping if missing
      if (!this._zoneRowIndex) {
        this._zoneRowIndex = new Uint8Array(h);
        const zoneForV = (v) => {
          const latRad = (0.5 - v) * Math.PI; const absDeg = Math.abs(latRad * (180/Math.PI));
          if (absDeg >= 66.5) return 2; if (absDeg >= 23.5) return 1; return 0;
        };
        for (let y = 0; y < h; y++) this._zoneRowIndex[y] = zoneForV(y / (h - 1));
      }
      // Build per-zone histograms (256 bins)
      this.heightZoneHists = {
        0: { counts: new Uint32Array(256), total: 0 },
        1: { counts: new Uint32Array(256), total: 0 },
        2: { counts: new Uint32Array(256), total: 0 },
      };
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const zi = this._zoneRowIndex[y];
        const bin = Math.max(0, Math.min(255, Math.floor(arr[i] * 255)));
        this.heightZoneHists[zi].counts[bin]++;
        this.heightZoneHists[zi].total++;
      }
    }

    // Seeded fractal cloud field 0..1 and histogram for quantile thresholds
    generateCloudMap(w, h) {
      const seed = this.hashSeedFromPlanet();
      let s = Math.floor((seed.x * 131071) ^ (seed.y * 524287)) >>> 0;
      const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
      const hash = (x, y) => {
        const n = Math.sin(x * 157.31 + y * 113.97 + s * 0.000137) * 43758.5453;
        return n - Math.floor(n);
      };
      const smooth = (t) => t * t * (3 - 2 * t);
      const value2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y, oct=8, lac=2.2, gain=0.5) => {
        let f = 0, amp = 0.5, freq = 0.9;
        for (let o = 0; o < oct; o++) { f += amp * value2(x * freq, y * freq); freq *= lac; amp *= gain; }
        return f;
      };
      const billow = (x, y, oct=5, lac=2.6, gain=0.52) => {
        let f = 0, amp = 0.6, freq = 1.2;
        for (let o = 0; o < oct; o++) {
          const n = value2(x * freq, y * freq);
          const b = 1.0 - Math.abs(2.0 * n - 1.0);
          f += amp * (b * b);
          freq *= lac; amp *= gain;
        }
        return f;
      };
      // Domain warp to mimic banding and flow patterns
      const arr = new Float32Array(w * h);
      let minV = Infinity, maxV = -Infinity;
      for (let y = 0; y < h; y++) {
        const vy = y / h;
        for (let x = 0; x < w; x++) {
          const vx = x / w;
          const wx = fbm(vx * 0.9 + 7.13, vy * 0.7 + 3.71);
          const wy = fbm(vx * 0.7 - 2.19, vy * 0.9 - 5.28);
          const ux = vx * 2.6 + (wx - 0.5) * 0.9;
          const uy = vy * 2.0 + (wy - 0.5) * 0.7;
          // Base fields
          const cumulus = fbm(ux, uy, 7, 2.15, 0.5);
          const cirrus  = Math.pow(fbm(ux * 3.4, uy * 0.7, 5, 2.7, 0.58), 1.5);
          // High-frequency fracture fields
          const cracks1 = billow(ux * 6.0, uy * 6.2, 4, 2.8, 0.55);
          const cracks2 = billow(ux * 12.0, uy * 11.5, 3, 2.9, 0.6);
          // Combine and carve holes to avoid monolithic sheets
          let v = 0.65 * cumulus + 0.35 * cirrus;
          v = v - 0.35 * cracks1 - 0.18 * cracks2;
          minV = Math.min(minV, v); maxV = Math.max(maxV, v);
          arr[y * w + x] = v;
        }
      }
      const span = Math.max(1e-6, maxV - minV);
      for (let i = 0; i < w * h; i++) arr[i] = (arr[i] - minV) / span;
      this.cloudMap = arr;
      // Histogram
      const hist = { counts: new Uint32Array(256), total: w * h };
      for (let i = 0; i < w * h; i++) {
        const bin = Math.max(0, Math.min(255, Math.floor(arr[i] * 255)));
        hist.counts[bin]++;
      }
      this.cloudHist = hist;
    }
  }

  // Expose and initialize from game lifecycle
  window.PlanetVisualizer = PlanetVisualizer;

  // Helper the game can call after resources/terraforming exist
  window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {
    window.planetVisualizer = new PlanetVisualizer();
    window.planetVisualizer.init();
  };
})();

