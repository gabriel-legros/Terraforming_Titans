// Planet Visualizer
// Lightweight wrapper around three.js to show a simple red sphere
// and overlay planet data from the running game.

(function () {
  class PlanetVisualizer {
    constructor(resourcesRef, terraformingRef) {
      // Dependencies (game globals)
      this.resources = resourcesRef;
      this.terraforming = terraformingRef;

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
      this.waterMask = null;      // cached water mask (grayscale FBM) for oceans

      // Bind methods
      this.animate = this.animate.bind(this);
      this.onResize = this.onResize.bind(this);
      this.applySlidersToGame = this.applySlidersToGame.bind(this);
      this.syncSlidersFromGame = this.syncSlidersFromGame.bind(this);
      this.updateSliderValueLabels = this.updateSliderValueLabels.bind(this);

      // Debug controls cache
      this.debug = {
        enabled: (function() {
          // Default true unless explicitly false
          return !(window['debug_planet-visualizer'] === false);
        })(),
        container: null,
        rows: {}, // id -> { range, number }
      };

      // Visualizer-local state (does not affect game)
      this.viz = {
        illum: 1,
        pop: 0,
        kpa: { co2: 0, o2: 0, inert: 0, h2o: 0, ch4: 0 },
        coverage: { water: 0, life: 0, cloud: 0 },
        zonalCoverage: {
          tropical: { water: 0, ice: 0 },
          temperate: { water: 0, ice: 0 },
          polar: { water: 0, ice: 0 }
        },
        inclinationDeg: 15,
      };
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
      const initialIllum = (currentPlanetParameters.celestialParameters.starLuminosity ?? 1) || 1;
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
      // Cloud sphere (shader-based procedural)
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
      // Ensure cloud shell matches planet rotation exactly
      if (this.cloudMesh) {
        this.cloudMesh.rotation.y = angle;
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

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.animate);
    }

    updateOverlayText() {
      const overlay = this.elements.overlay;
      if (!overlay) return;

      // Population from resources
      const colonists = this.resources.colony.colonists.value;

      // CO2 pressure from atmospheric CO2 mass and current world params
      const co2MassTon = this.resources.atmospheric.carbonDioxide.value;
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

      // Coverage sliders (percent)
      makeRow('waterCov', 'Water (%)', 0, 100, 0.1);
      makeRow('lifeCov',  'Life (%)',  0, 100, 0.1);
      makeRow('cloudCov', 'Clouds (%)', 0, 100, 0.1);

      const controls = document.createElement('div');
      controls.className = 'pv-controls';
      const btnSync = document.createElement('button');
      btnSync.textContent = 'Set to game parameters';
      // Use arrow to ensure correct context
      btnSync.addEventListener('click', () => this.syncSlidersFromGame());
      controls.appendChild(btnSync);
      host.appendChild(controls);

      // Place debug panel directly after the canvas container
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
      setVal('cloudCov', Number(r.cloudCov?.range?.value || 0));
      setVal('waterCov', Number(r.waterCov.range.value));
      setVal('lifeCov',  Number(r.lifeCov.range.value));
    }

    // ---------- City lights ----------
    createCityLights() {
      if (!this.sphere) return;
      this.cityLightsGroup = new THREE.Group();
      this.sphere.add(this.cityLightsGroup);

      const geom = new THREE.SphereGeometry(0.015, 8, 8);
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
      const cloudRadius = 1.022; // between planet and atmosphere
      const geo = new THREE.SphereGeometry(cloudRadius, 48, 32);
      const seed = this.hashSeedFromPlanet();
      const uniforms = {
        sunDir: { value: new THREE.Vector3(1,0,0) },
        time: { value: 0 },
        coverage: { value: 0.5 },
        baseScale: { value: 2.5 },
        warpScale: { value: 0.8 },
        flow: { value: 0.03 },
        seed: { value: new THREE.Vector2(seed.x, seed.y) },
      };
      const vtx = `
        precision highp float;
        varying vec3 vWorldPos; varying vec3 vWorldDir; varying vec3 vObjDir;
        void main(){
          vec4 wp = modelMatrix * vec4(position,1.0);
          vWorldPos = wp.xyz;
          vWorldDir = normalize(wp.xyz);
          vObjDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `;
      const frag = `
        precision highp float; varying vec3 vWorldPos; varying vec3 vWorldDir; varying vec3 vObjDir;
        uniform vec3 sunDir; uniform float time; uniform float coverage; uniform vec2 seed; uniform float baseScale; uniform float warpScale; uniform float flow;
        const float PI = 3.14159265359;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(in vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); float a=hash(i); float b=hash(i+vec2(1,0)); float c=hash(i+vec2(0,1)); float d=hash(i+vec2(1,1)); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
        float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
        void main(){
          vec3 Nworld = normalize(vWorldDir);
          vec3 Nobj = normalize(vObjDir);
          // Equirectangular UV from object space so pattern rotates with planet
          float u = atan(Nobj.z, Nobj.x)/(2.0*PI) + 0.5; float v = acos(Nobj.y)/PI;
          vec2 uv = vec2(u,v);
          // No longitudinal advection; morph shapes slowly via time-based domain warp
          float lat = asin(Nobj.y);
          vec2 q = uv*baseScale + seed;
          vec2 morph = vec2(cos(time), sin(time)) * 0.1;
          vec2 warp = vec2(fbm(q + 3.1*seed), fbm(q + 5.7*seed));
          float n = fbm(q + warp*warpScale + morph);
          // Soft threshold for puffs
          float d = smoothstep(0.55, 0.75, n);
          // Day-side lighting
          float day = clamp(dot(Nworld, normalize(sunDir))*0.7 + 0.3, 0.0, 1.0);
          float a = d * clamp(coverage,0.0,1.0) * day;
          if (a <= 0.001) discard;
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `;
      this.cloudMaterial = new THREE.ShaderMaterial({
        vertexShader: vtx,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        depthWrite: false,
      });
      this.cloudMesh = new THREE.Mesh(geo, this.cloudMaterial);
      // Keep as separate node; we will explicitly sync its rotation to the planet each frame
      this.scene.add(this.cloudMesh);
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
      if (this.debug.enabled) {
        return this.viz.pop || 0;
      }
      return (this.resources?.colony?.colonists?.value) || 0;
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
      if (!this.cloudMaterial || !this.cloudMaterial.uniforms) return;
      const cov = Math.max(0, Math.min(1, (this.viz.coverage?.cloud || 0)/100));
      this.cloudMaterial.uniforms.coverage.value = cov;
      // Morph time: one full cycle every ~2.5 in-game days
      let t = 0.0;
      if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.dayDuration === 'number') {
        const daysElapsed = (dayNightCycle.elapsedTime || 0) / Math.max(1, dayNightCycle.dayDuration);
        t = (daysElapsed / 2.5) * (Math.PI * 2.0);
      } else {
        t = (performance.now() / 1000 / 60 / 2.5) * (Math.PI * 2.0);
      }
      this.cloudMaterial.uniforms.time.value = t;
      const dir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1,0,0);
      this.cloudMaterial.uniforms.sunDir.value.copy(dir);
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

      // Coverage sliders (visual only)
      this.viz.coverage.water = clampFrom(r.waterCov);
      this.viz.coverage.life  = clampFrom(r.lifeCov);
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
      const illum = cel.starLuminosity ?? 1;
      r.illum.range.value = String(illum);
      r.illum.number.value = String(illum);
      // Inclination sync from local viz (default 15 deg)
      if (r.incl) {
        const inc = (this.viz?.inclinationDeg ?? 15);
        r.incl.range.value = String(inc);
        r.incl.number.value = String(inc);
      }
      // Population
      const popNow = this.resources.colony.colonists.value || 0;
      r.pop.range.value = String(popNow);
      r.pop.number.value = String(popNow);
      // Spaceships (sync from game if available, otherwise visual state)
      const shipVal = (this.resources?.special?.spaceships?.value) ?? (this.viz.ships || 0);
      if (r.ships) { r.ships.range.value = String(shipVal); r.ships.number.value = String(shipVal); }

      const toKPa = (massTon) => calculateAtmosphericPressure(massTon || 0, cel.gravity, cel.radius) / 1000;
      const clamp100 = (v) => Math.max(0, Math.min(100, v));
      const atm = this.resources.atmospheric;
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

      // Coverage from terraforming (fractions to percent)
      const waterFrac = (typeof calculateAverageCoverage === 'function' && typeof terraforming !== 'undefined')
        ? calculateAverageCoverage(terraforming, 'liquidWater') : 0;
      const lifeFrac  = (typeof calculateAverageCoverage === 'function' && typeof terraforming !== 'undefined')
        ? calculateAverageCoverage(terraforming, 'biomass') : 0;
      r.waterCov.range.value = String((waterFrac * 100).toFixed(2));
      r.waterCov.number.value = r.waterCov.range.value;
      r.lifeCov.range.value = String((lifeFrac * 100).toFixed(2));
      r.lifeCov.number.value = r.lifeCov.range.value;
      // Set clouds initially equal to water (user can change)
      if (r.cloudCov) {
        r.cloudCov.range.value = r.waterCov.range.value;
        r.cloudCov.number.value = r.cloudCov.range.value;
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
      this.viz.coverage = {
        water: Number(r.waterCov.range.value),
        life: Number(r.lifeCov.range.value),
        cloud: Number(r.cloudCov ? r.cloudCov.range.value : r.waterCov.range.value),
      };
      this.viz.ships = Number(r.ships ? r.ships.range.value : 0);
      if (this.sunLight) this.sunLight.intensity = this.viz.illum;
      this.updateSurfaceTextureFromPressure(true);
      this.updateCloudUniforms();
    }

    // ---------- Crater texture generation ----------
    computeTotalPressureKPa() {
      // When debug is enabled, use visualizer kPa values; otherwise use actual game resources
      if (this.debug.enabled) {
        const k = this.viz.kpa;
        return (k.co2 + k.o2 + k.inert + k.h2o + k.ch4);
      }
      const cel = currentPlanetParameters.celestialParameters;
      let totalPa = 0;
      const atm = this.resources.atmospheric || {};
      for (const key in atm) {
        const mass = atm[key]?.value || 0;
        totalPa += calculateAtmosphericPressure(mass, cel.gravity, cel.radius) || 0;
      }
      return totalPa / 1000; // kPa
    }

    updateSurfaceTextureFromPressure(force = false) {
      const kPa = this.computeTotalPressureKPa();
      // 0 kPa -> 1 (full craters), 100 kPa+ -> 0 (few craters)
      const factor = Math.max(0, Math.min(1, 1 - (kPa / 100)));
      const water = (this.viz.coverage?.water || 0) / 100;
      const life = (this.viz.coverage?.life || 0) / 100;
      // Memo key rounded to 2 decimals to avoid churn; include zonal coverage
        const z = this.viz.zonalCoverage || {};
        const zKey = ['tropical','temperate','polar']
          .map(k=>`${(z[k]?.water??0).toFixed(2)}_${(z[k]?.ice??0).toFixed(2)}`)
          .join('|');
        const key = `${factor.toFixed(2)}|${water.toFixed(2)}|${life.toFixed(2)}|${zKey}`;
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
      const topCol = '#8a2a2a';
      const botCol = '#6e1f1f';
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

      // ----- Oceans overlay (above terrain/craters) -----
      if (!this.waterMask) {
        this.waterMask = this.generateWaterMask(w, h);
      }
      // Threshold so that waterT=0 -> no oceans, 1 -> nearly full coverage
      const thr = waterT; // base threshold
      const coastWidth = 0.01; // sharper coastline transition
      const ocean = document.createElement('canvas');
      ocean.width = w; ocean.height = h;
      const octx = ocean.getContext('2d');
      const img = octx.createImageData(w, h);
      const data = img.data;
      // Helper: map v in [0,1] to zone key using 23.5/66.5 deg bounds
      const zoneForV = (v) => {
        // v: 0 = north pole, 0.5 = equator, 1 = south pole
        const latRad = (0.5 - v) * Math.PI; // latitude radians, positive north
        const latDeg = latRad * (180/Math.PI);
        const absDeg = Math.abs(latDeg);
        if (absDeg >= 66.5) return 'polar';
        if (absDeg >= 23.5) return 'temperate';
        return 'tropical';
      };
      const zonal = this.viz.zonalCoverage || {};
      for (let i = 0; i < w * h; i++) {
        const v = this.waterMask[i];
        // smoothstep inverse: ocean where v below threshold
        let a = 1 - ((v - thr + coastWidth) / (2 * coastWidth));
        a = Math.max(0, Math.min(1, a));
        // Scale ocean alpha by zonal water coverage for this pixel's latitude
        const y = Math.floor(i / w);
        const zone = zoneForV(y / (h - 1));
        const zw = Math.max(0, Math.min(1, (zonal[zone]?.water ?? 0)));
        a *= zw;
        const idx = i * 4;
        // Deep ocean blue
        // Deep ocean blue
        const r = 10, g = 40, b = 120;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.floor(a * 255);
      }
      octx.putImageData(img, 0, 0);
      ctx.drawImage(ocean, 0, 0);

      // ----- Ice overlay (above oceans/terrain) -----
      const iceCanvas = document.createElement('canvas');
      iceCanvas.width = w; iceCanvas.height = h;
      const ictx = iceCanvas.getContext('2d');
      const iimg = ictx.createImageData(w, h);
      const idata = iimg.data;
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const zone = zoneForV(y / (h - 1));
        // Use zonal ice fraction as direct alpha; clamp
        const zi = Math.max(0, Math.min(1, (zonal[zone]?.ice ?? 0)));
        const idx = i * 4;
        // light blue-white ice color
        const r = 200, g = 220, b = 255;
        idata[idx] = r;
        idata[idx + 1] = g;
        idata[idx + 2] = b;
        idata[idx + 3] = Math.floor(zi * 255); // full opacity at 100%
      }
      ictx.putImageData(iimg, 0, 0);
      ctx.drawImage(iceCanvas, 0, 0);

      // Green cloud layer scales with life coverage
      const lifeT = (this.viz.coverage?.life || 0) / 100;
      if (lifeT > 0) {
        if (!this.cloudLayer) {
          const cloud = document.createElement('canvas');
          cloud.width = w; cloud.height = h;
          const cctx = cloud.getContext('2d');
          const blobs = 180;
          for (let i = 0; i < blobs; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 12 + Math.random() * 48;
            const g = cctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(5, 241, 80, 0.88)');
            g.addColorStop(1, 'rgba(5, 255, 84, 0)');
            cctx.fillStyle = g;
            cctx.beginPath(); cctx.arc(x, y, r, 0, Math.PI * 2); cctx.fill();
          }
          this.cloudLayer = cloud;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, lifeT));
        ctx.drawImage(this.cloudLayer, 0, 0);
        ctx.globalAlpha = 1;
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
  }

  // Expose and initialize from game lifecycle
  window.PlanetVisualizer = PlanetVisualizer;

  // Helper the game can call after resources/terraforming exist
  window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {
    window.planetVisualizer = new PlanetVisualizer(window.resources, window.terraforming);
    window.planetVisualizer.init();
  };
})();

