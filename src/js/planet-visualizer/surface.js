(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const LAVA_WORLD_START_K = 900;
  const LAVA_WORLD_FULL_K = 1400;

  const PLANET_TYPE_TEXTURES = {
    default: {
      top: { color: '#ffffff', t: 0.2 },
      bottom: { color: '#000000', t: 0.35 },
      topJitter: 0.04,
      bottomJitter: 0.04,
      heightScale: 1,
      heightJitter: 0.05,
      featureMask: 1,
      shade: 1,
    },
    'mars-like': {
      top: { color: '#f4c9a3', t: 0.32 },
      bottom: { color: '#2d110f', t: 0.55 },
      tint: { color: '#c86a42', min: 0.05, max: 0.12 },
      topJitter: 0.06,
      bottomJitter: 0.05,
      heightScale: 1.08,
      heightJitter: 0.04,
      featureMask: 1,
      shade: 1,
    },
    'cold-desert': {
      top: { color: '#f7e6c5', t: 0.38 },
      bottom: { color: '#3a2717', t: 0.45 },
      tint: { color: '#d3a86b', min: 0.04, max: 0.1 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 0.98,
      heightJitter: 0.05,
      featureMask: 0.9,
      shade: 1,
    },
    'icy-moon': {
      top: { color: '#eef6ff', t: 0.62 },
      bottom: { color: '#1a2e45', t: 0.35 },
      tint: { color: '#d4e8ff', min: 0.18, max: 0.28 },
      topJitter: 0.04,
      bottomJitter: 0.04,
      heightScale: 0.85,
      heightJitter: 0.04,
      featureMask: 0.7,
      shade: 1.05,
    },
    'titan-like': {
      top: { color: '#f4d79f', t: 0.34 },
      bottom: { color: '#24160a', t: 0.48 },
      tint: { color: '#d4a45c', min: 0.06, max: 0.12 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 0.9,
      heightJitter: 0.05,
      featureMask: 1.1,
      shade: 1,
    },
    'carbon-planet': {
      top: { color: '#bfc1c5', t: 0.2 },
      bottom: { color: '#050608', t: 0.7 },
      tint: { color: '#2e2c34', min: 0.12, max: 0.22 },
      topJitter: 0.03,
      bottomJitter: 0.06,
      heightScale: 1.05,
      heightJitter: 0.04,
      featureMask: 1.35,
      shade: 0.92,
    },
    'desiccated-desert': {
      top: { color: '#f5d6a8', t: 0.36 },
      bottom: { color: '#382413', t: 0.5 },
      tint: { color: '#d7aa68', min: 0.05, max: 0.11 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 1,
      heightJitter: 0.05,
      featureMask: 0.95,
      shade: 1,
    },
    'super-earth': {
      top: { color: '#d3f0d4', t: 0.26 },
      bottom: { color: '#18341d', t: 0.56 },
      tint: { color: '#6fae70', min: 0.08, max: 0.16 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 1.12,
      heightJitter: 0.06,
      featureMask: 0.8,
      shade: 1,
    },
    'chthonian': {
      top: { color: '#c7c2b4', t: 0.22 },
      bottom: { color: '#1f1b16', t: 0.6 },
      tint: { color: '#766a5a', min: 0.08, max: 0.16 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 1.14,
      heightJitter: 0.06,
      featureMask: 0.82,
      shade: 0.98,
    },
    'venus-like': {
      top: { color: '#f7e6b2', t: 0.38 },
      bottom: { color: '#3f2c12', t: 0.5 },
      tint: { color: '#d1b063', min: 0.05, max: 0.1 },
      topJitter: 0.05,
      bottomJitter: 0.05,
      heightScale: 0.92,
      heightJitter: 0.05,
      featureMask: 0.85,
      shade: 0.98,
    },
    'molten': {
      top: { color: '#ffb36b', t: 0.22 },
      bottom: { color: '#240a05', t: 0.62 },
      tint: { color: '#ff5a1f', min: 0.12, max: 0.22 },
      topJitter: 0.06,
      bottomJitter: 0.07,
      heightScale: 1.08,
      heightJitter: 0.07,
      featureMask: 0.92,
      shade: 0.94,
    },
    artificial: {
      top: { color: '#e4e8ec', t: 0.42 },
      bottom: { color: '#5a6167', t: 0.52 },
      tint: { color: '#9aa5b1', min: 0.1, max: 0.2 },
      topJitter: 0.03,
      bottomJitter: 0.03,
      heightScale: 0.7,
      heightJitter: 0.02,
      featureMask: 0,
      shade: 1.08,
    },
  };

  function resolvePlanetArchetype(context, baseHex) {
    let type = null;
    if (context?.viz?.classification?.archetype) {
      type = context.viz.classification.archetype;
    }
    if (!type && typeof currentPlanetParameters !== 'undefined') {
      type = currentPlanetParameters?.classification?.archetype || null;
    }
    if (!type && typeof window !== 'undefined') {
      const sm = window.spaceManager;
      if (sm?.currentWorld?.classification?.archetype) {
        type = sm.currentWorld.classification.archetype;
      }
    }
    if (!type && typeof RWG_TYPE_BASE_COLORS !== 'undefined' && baseHex) {
      const match = baseHex.toLowerCase();
      for (const [key, color] of Object.entries(RWG_TYPE_BASE_COLORS)) {
        if (typeof color === 'string' && color.toLowerCase() === match) {
          type = key;
          break;
        }
      }
    }
    return type || 'default';
  }

  function createJitterRandom(seedX, seedY) {
    const sx = Number.isFinite(seedX) ? seedX : 0.37;
    const sy = Number.isFinite(seedY) ? seedY : 0.73;
    let state = Math.floor((sx * 104729)) ^ Math.floor((sy * 130363)) ^ 0x9e3779b9;
    state >>>= 0;
    if (state === 0) state = 0x6d2b79f5;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  function mixHexColors(hexA, hexB, t) {
    const parse = (hex) => {
      const value = parseInt(hex.slice(1), 16);
      return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
      };
    };
    const a = parse(hexA);
    const b = parse(hexB);
    const lerp = (x, y, amt) => Math.round(x + (y - x) * amt);
    const toHex = (v) => v.toString(16).padStart(2, '0');
    const amt = clamp01(t);
    const r = lerp(a.r, b.r, amt);
    const g = lerp(a.g, b.g, amt);
    const bl = lerp(a.b, b.b, amt);
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
  }

  function smoothstep(edge0, edge1, value) {
    const span = Math.max(1e-6, edge1 - edge0);
    const t = clamp01((value - edge0) / span);
    return t * t * (3 - 2 * t);
  }

  PlanetVisualizer.prototype.getSurfaceTemperatureK = function getSurfaceTemperatureK() {
    const worldTemp = this.terraforming?.temperature?.value;
    if (Number.isFinite(worldTemp) && worldTemp > 0) {
      return worldTemp;
    }
    const fallbackTemp = currentPlanetParameters?.celestialParameters?.temperature?.mean;
    if (Number.isFinite(fallbackTemp) && fallbackTemp > 0) {
      return fallbackTemp;
    }
    return 0;
  };

  PlanetVisualizer.prototype.getLavaTransitionStrength = function getLavaTransitionStrength() {
    return smoothstep(LAVA_WORLD_START_K, LAVA_WORLD_FULL_K, this.getSurfaceTemperatureK());
  };

  PlanetVisualizer.prototype.updateSurfaceHeatMaterial = function updateSurfaceHeatMaterial() {
    const surface = this.surfaceMesh || this.sphere;
    const material = surface?.material;
    if (!material) return;

    const lava = this.getLavaTransitionStrength();
    const baseRoughness = surface.userData?.baseRoughness ?? (this.isRingWorld() ? 0.85 : 0.9);
    const baseMetalness = surface.userData?.baseMetalness ?? 0;
    material.roughness = Math.max(0.22, baseRoughness - lava * 0.45);
    material.metalness = Math.min(0.16, baseMetalness + lava * 0.06);
    if (material.emissive) {
      material.emissive.setRGB(0.95, 0.18 + lava * 0.16, 0.03 + lava * 0.07);
      material.emissiveIntensity = lava * 0.72;
    }
  };

  PlanetVisualizer.prototype.createLavaOverlayMesh = function createLavaOverlayMesh() {
    if (this.lavaOverlayMesh || !this.surfaceMesh) return;

    const isRing = this.isRingWorld();
    const geometry = isRing
      ? new THREE.CylinderGeometry(
        Math.max(0.1, (this.ringRadius || 1) - 0.003),
        Math.max(0.1, (this.ringRadius || 1) - 0.003),
        this.ringHeight || 0.23625,
        96,
        1,
        true
      )
      : new THREE.SphereGeometry(1.003, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: isRing ? THREE.BackSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    this.surfaceMesh.add(mesh);
    this.lavaOverlayMesh = mesh;
    this.lavaOverlayMaterial = material;
  };

  PlanetVisualizer.prototype.getGasGiantVisualState = function getGasGiantVisualState() {
    const pressureByKey = this.debug.mode === 'debug'
      ? null
      : this.terraforming?.atmosphericPressureCache?.pressureByKey;
    const totalPressureKPa = Math.max(0, this.computeTotalPressureKPa());
    const hydrogenKPa = this.debug.mode === 'debug'
      ? Math.max(0, this.viz.kpa.h2 || 0)
      : Math.max(0, (pressureByKey?.hydrogen || 0) / 1000);
    const methaneKPa = this.debug.mode === 'debug'
      ? Math.max(0, this.viz.kpa.ch4 || 0)
      : Math.max(0, (pressureByKey?.atmosphericMethane || 0) / 1000);
    const ammoniaKPa = this.debug.mode === 'debug'
      ? Math.max(0, this.viz.kpa.nh3 || 0)
      : Math.max(0, (pressureByKey?.atmosphericAmmonia || 0) / 1000);
    const hydrogenShare = totalPressureKPa > 0 ? hydrogenKPa / totalPressureKPa : 0;
    const liquidHydrogenCoverage = this.debug.mode === 'debug'
      ? 0
      : Math.max(0, calculateAverageCoverage(this.terraforming, 'liquidHydrogen') || 0);

    const hydrogenStrength = Math.max(
      smoothstep(60, 800, hydrogenKPa),
      smoothstep(0.08, 0.5, hydrogenShare),
      smoothstep(0.04, 0.28, liquidHydrogenCoverage)
    );
    const methaneStrength = smoothstep(3, 140, methaneKPa) * hydrogenStrength;
    const ammoniaStrength = smoothstep(1.5, 70, ammoniaKPa) * hydrogenStrength;
    const overlayStrength = clamp01(
      Math.max(
        hydrogenStrength,
        hydrogenStrength * (0.88 + methaneStrength * 0.06 + ammoniaStrength * 0.06)
      )
    );

    return {
      overlayStrength,
      hydrogenStrength,
      methaneStrength,
      ammoniaStrength,
      hydrogenKPa,
      methaneKPa,
      ammoniaKPa,
      liquidHydrogenCoverage,
    };
  };

  PlanetVisualizer.prototype.createGasOverlayMesh = function createGasOverlayMesh() {
    if (this.gasOverlayMesh || !this.surfaceMesh) return;

    const isRing = this.isRingWorld();
    const geometry = isRing
      ? new THREE.CylinderGeometry(
        Math.max(0.1, (this.ringRadius || 1) + 0.055),
        Math.max(0.1, (this.ringRadius || 1) + 0.055),
        (this.ringHeight || 0.23625) + 0.02,
        96,
        1,
        true
      )
      : new THREE.SphereGeometry(1.055, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: isRing ? THREE.BackSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.renderOrder = 6;
    this.surfaceMesh.add(mesh);
    this.gasOverlayMesh = mesh;
    this.gasOverlayMaterial = material;
  };

  PlanetVisualizer.prototype.ensureLavaOverlayTexture = function ensureLavaOverlayTexture() {
    const material = this.lavaOverlayMaterial;
    if (!material) return;

    const { w, h } = this.getSurfaceTextureSize();
    const textureKey = `${w}x${h}`;
    if (this.lavaOverlayTexture && this.lavaOverlayTextureKey === textureKey) {
      return;
    }

    if (!this.heightMap || this.heightMap.length !== w * h) {
      this.generateHeightMap(w, h);
    }

    const texture = this.generateLavaOverlayTexture(w, h);
    if (this.lavaOverlayTexture && this.lavaOverlayTexture.dispose) {
      this.lavaOverlayTexture.dispose();
    }
    this.lavaOverlayTexture = texture;
    this.lavaOverlayTextureKey = textureKey;
    material.map = texture;
    material.needsUpdate = true;
  };

  PlanetVisualizer.prototype.ensureGasOverlayTexture = function ensureGasOverlayTexture(state) {
    const material = this.gasOverlayMaterial;
    if (!material) return;

    const { w, h } = this.getSurfaceTextureSize();
    const textureKey = [
      `${w}x${h}`,
      state.hydrogenStrength.toFixed(3),
      state.methaneStrength.toFixed(3),
      state.ammoniaStrength.toFixed(3),
      state.overlayStrength.toFixed(3),
    ].join('|');
    if (this.gasOverlayTexture && this.gasOverlayTextureKey === textureKey) {
      return;
    }

    const texture = this.generateGasOverlayTexture(w, h, state);
    if (this.gasOverlayTexture && this.gasOverlayTexture.dispose) {
      this.gasOverlayTexture.dispose();
    }
    this.gasOverlayTexture = texture;
    this.gasOverlayTextureKey = textureKey;
    material.map = texture;
    material.needsUpdate = true;
  };

  PlanetVisualizer.prototype.updateLavaOverlay = function updateLavaOverlay() {
    const mesh = this.lavaOverlayMesh;
    const material = this.lavaOverlayMaterial;
    if (!mesh || !material) return;

    const lava = this.getLavaTransitionStrength();
    if (lava <= 0) {
      mesh.visible = false;
      material.opacity = 0;
      return;
    }

    this.ensureLavaOverlayTexture();
    mesh.visible = true;
    material.opacity = lava;
  };

  PlanetVisualizer.prototype.updateGasOverlay = function updateGasOverlay() {
    const mesh = this.gasOverlayMesh;
    const material = this.gasOverlayMaterial;
    if (!mesh || !material) return;

    const state = this.getGasGiantVisualState();
    if (state.overlayStrength <= 0) {
      mesh.visible = false;
      material.opacity = 0;
      return;
    }

    this.ensureGasOverlayTexture(state);
    mesh.visible = true;
    material.opacity = clamp01(smoothstep(0.12, 0.7, state.overlayStrength) * 1.16);
  };

  PlanetVisualizer.prototype.buildZoneRowIndex = function buildZoneRowIndex(h) {
    const rows = new Uint8Array(h);
    if (this.isRingWorld()) return rows;
    const zoneForV = (v) => {
      const latRad = (0.5 - v) * Math.PI;
      const absDeg = Math.abs(latRad * (180 / Math.PI));
      if (absDeg >= 66.5) return 2;
      if (absDeg >= 23.5) return 1;
      return 0;
    };
    for (let y = 0; y < h; y++) {
      rows[y] = zoneForV(y / (h - 1));
    }
    return rows;
  };

  PlanetVisualizer.prototype.getSurfaceTextureSize = function getSurfaceTextureSize() {
    if (this.isRingWorld()) {
      const aspect = this.getRingUvAspect();
      const w = 2048;
      const h = Math.max(64, Math.round(w / aspect));
      return { w, h };
    }
    return { w: 1024, h: 512 };
  };

  PlanetVisualizer.prototype.getRingUvAspect = function getRingUvAspect() {
    if (!this.isRingWorld()) return 1;
    const height = Math.max(0.05, this.ringHeight || 0.315);
    const radius = Math.max(0.1, this.ringRadius || 1);
    return (Math.PI * 2 * radius) / height;
  };

  PlanetVisualizer.prototype.updateSurfaceTextureFromPressure = function updateSurfaceTextureFromPressure(force = false) {
    if (this.debug.mode === 'game') {
      const gameBase = this.getGameBaseColor();
      if (gameBase !== this.viz.baseColor) {
        this.setBaseColor(gameBase, { fromGame: true, force: true, skipSurfaceUpdate: true });
      }
    }
    if (!force) {
      const now = performance.now();
      if (now - (this._lastSurfaceTextureUpdate || 0) < 5000) return;
      this._lastSurfaceTextureUpdate = now;
    }
    const kPa = this.computeTotalPressureKPa();
    const factor = Math.max(0, Math.min(1, 1 - (kPa / 100)));
    const water = (this.viz.coverage?.water || 0) / 100;
    const life = (this.viz.coverage?.life || 0) / 100;
    const cloud = (this.viz.coverage?.cloud || 0) / 100;
    const z = this.viz.zonalCoverage || {};
    const zKey = ['tropical', 'temperate', 'polar']
      .map(k => `${(z[k]?.water ?? 0).toFixed(2)}_${(z[k]?.ice ?? 0).toFixed(2)}_${(z[k]?.life ?? 0).toFixed(2)}`)
      .join('|');
    const baseColorKey = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
    const dustBaseColor = this.normalizeHexColor(this.dustTintColor) || baseColorKey;
    // Include planet type in cache key so palette changes (archetype) update texture
    let typeKey = 'default';
    try { typeKey = resolvePlanetArchetype(this, baseColorKey) || 'default'; } catch (e) {}
    const sf = this.viz.surfaceFeatures || {};
    const fKey = `${sf.enabled ? '1' : '0'}_${Number(sf.strength || 0).toFixed(2)}_${Number(sf.scale || 0).toFixed(2)}_${Number(sf.contrast || 0).toFixed(2)}_${Number(sf.offsetX || 0).toFixed(2)}_${Number(sf.offsetY || 0).toFixed(2)}`;
    const key = `${factor.toFixed(2)}|${water.toFixed(2)}|${life.toFixed(2)}|${cloud.toFixed(2)}|${zKey}|${dustBaseColor}|${typeKey}|${fKey}`;
    if (!force && key === this.lastCraterFactorKey) return;
    this.lastCraterFactorKey = key;

    const tex = this.generateCraterTexture(factor, dustBaseColor);
    const surface = this.surfaceMesh || this.sphere;
    if (surface && surface.material) {
      surface.material.map = tex;
      surface.material.needsUpdate = true;
    }
  };

  PlanetVisualizer.prototype.resetSurfaceTextureThrottle = function resetSurfaceTextureThrottle() {
    this._lastSurfaceTextureUpdate = 0;
    this.lastCraterFactorKey = null;
  };

  PlanetVisualizer.prototype.generateCraterTexture = function generateCraterTexture(strength, surfaceBaseHex) {
    const { w, h } = this.getSurfaceTextureSize();
    const ringAspect = this.getRingUvAspect();

    if (!this.craterLayer) {
      const craterCanvas = document.createElement('canvas');
      craterCanvas.width = w; craterCanvas.height = h;
      const cctx = craterCanvas.getContext('2d');
      const maxCount = Math.floor(150 * 1 + 50);
      for (let i = 0; i < maxCount; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = (0.5 + Math.random() * 3) * (0.5 + 1);
        const g1 = cctx.createRadialGradient(x, y, r * 0.6, x, y, r);
        g1.addColorStop(0, 'rgba(0,0,0,0)');
        g1.addColorStop(1, 'rgba(0,0,0,0.25)');
        cctx.fillStyle = g1;
        cctx.beginPath();
        cctx.arc(x, y, r, 0, Math.PI * 2);
        cctx.fill();

        const g2 = cctx.createRadialGradient(x, y, 0, x, y, r * 0.6);
        g2.addColorStop(0, 'rgba(255,255,255,0.08)');
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        cctx.fillStyle = g2;
        cctx.beginPath();
        cctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        cctx.fill();
      }
      this.craterLayer = craterCanvas;
      const img = cctx.getImageData(0, 0, w, h);
      const data = img.data;
      this.craterAlphaData = new Float32Array(w * h);
      this._zoneRowIndex = this.buildZoneRowIndex(h);
      this.craterZoneHists = {
        0: { counts: new Uint32Array(256), total: 0 },
        1: { counts: new Uint32Array(256), total: 0 },
        2: { counts: new Uint32Array(256), total: 0 },
      };
      for (let i = 0; i < w * h; i++) {
        const a = data[i * 4 + 3] / 255;
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

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

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
    const baseHex = this.normalizeHexColor(surfaceBaseHex) || this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
    const seed = this.hashSeedFromPlanet ? this.hashSeedFromPlanet() : { x: 0.137, y: 0.733 };
    const planetType = resolvePlanetArchetype(this, this.normalizeHexColor(this.viz.baseColor) || baseHex);
    const palette = PLANET_TYPE_TEXTURES[planetType] || PLANET_TYPE_TEXTURES.default;
    const isArtificial = planetType === 'artificial';
    const isRing = this.isRingWorld();
    const rand = createJitterRandom(seed.x, seed.y);

    let gradientBase = baseHex;
    if (palette.tint) {
      const min = clamp01(palette.tint.min ?? 0);
      const max = clamp01(palette.tint.max ?? min);
      const tintAmt = clamp01(min + (max - min) * rand());
      if (tintAmt > 0) {
        gradientBase = mixHexColors(baseHex, palette.tint.color, tintAmt);
      }
    }

    const topTarget = palette.top?.color || '#ffffff';
    const bottomTarget = palette.bottom?.color || '#000000';
    const topBase = palette.top?.t ?? 0.2;
    const bottomBase = palette.bottom?.t ?? 0.35;
    const topJitter = palette.topJitter || 0;
    const bottomJitter = palette.bottomJitter || 0;
    const topMix = clamp01(topBase + (topJitter ? (rand() - 0.5) * 2 * topJitter : 0));
    const bottomMix = clamp01(bottomBase + (bottomJitter ? (rand() - 0.5) * 2 * bottomJitter : 0));
    const topCol = mixHexColors(gradientBase, topTarget, topMix);
    const botCol = mixHexColors(gradientBase, bottomTarget, bottomMix);

    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, topCol);
    base.addColorStop(1, botCol);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const baseHeightScale = palette.heightScale ?? 1;
    const heightJitter = palette.heightJitter || 0;
    const heightScale = Math.max(0.3, baseHeightScale * (1 + (heightJitter ? (rand() - 0.5) * 2 * heightJitter : 0)));
    const featureMask = Math.max(0, palette.featureMask ?? 1);
    const shadeBias = palette.shade ?? 1;

    const craterStrength = isArtificial ? 0 : strength;
    if (craterStrength > 0) {
      ctx.globalAlpha = Math.max(0, Math.min(1, craterStrength));
      ctx.drawImage(this.craterLayer, 0, 0);
      ctx.globalAlpha = 1;
    }

    if (!this.heightMap) this.generateHeightMap(w, h);
    try {
      const timg = ctx.getImageData(0, 0, w, h);
      const tdata = timg.data;

      // Prepare large-scale feature noise (dark regions)
      let s = Math.floor((seed.x * 65535) ^ (seed.y * 524287)) >>> 0;
      const hash = (x, y) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.000071) * 43758.5453;
        return n - Math.floor(n);
      };
      const smooth = (t) => t * t * (3 - 2 * t);
      const usePeriodic = this.isRingWorld();
      const wrapIndex = (idx, period) => {
        const p = Math.max(1, Math.round(period));
        let v = idx % p;
        if (v < 0) v += p;
        return v;
      };
      const value2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const value2Periodic = (x, y, period) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const x0 = wrapIndex(xi, period);
        const x1 = wrapIndex(xi + 1, period);
        const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y, oct = 4, lac = 2.0, gain = 0.5, periodBase = 0) => {
        let f = 0, amp = 0.5, freq = 1.0;
        for (let o = 0; o < oct; o++) {
          const px = x * freq;
          const py = y * freq;
          const period = periodBase ? periodBase * freq : 0;
          f += amp * (usePeriodic && period ? value2Periodic(px, py, period) : value2(px, py));
          freq *= lac; amp *= gain;
        }
        return f;
      };
      const feat = this.viz.surfaceFeatures || {};
      const fEnabled = !!feat.enabled;
      const fStrength = Math.max(0, Math.min(1, Number(feat.strength || 0)));
      const fScale = Math.max(0.05, Number(feat.scale || 0.7));
      const fContrast = Math.max(0, Number(feat.contrast || 1.2));
      const fOffX = Number(feat.offsetX || 0);
      const fOffY = Number(feat.offsetY || 0);
      const useFeatures = fEnabled && fStrength > 0;
      const mountainStrength = isArtificial ? 0 : 0.35;
      let mountainThreshold = 1;
      if (mountainStrength > 0) {
        const hist0 = this.heightZoneHists[0];
        const hist1 = this.heightZoneHists[1];
        const hist2 = this.heightZoneHists[2];
        const total = hist0.total + hist1.total + hist2.total;
        const target = total * 0.92;
        let acc = 0;
        let thrBin = 255;
        for (let k = 0; k <= 255; k++) {
          acc += hist0.counts[k] + hist1.counts[k] + hist2.counts[k];
          if (acc >= target) { thrBin = k; break; }
        }
        mountainThreshold = thrBin / 255;
      }

      const stripeScale = 6 + rand() * 2.5;
      const microScale = 90 + rand() * 40;
      const stripePhase = rand() * Math.PI * 2;
      const microPhase = rand() * 10;
      const featurePeriod = ringAspect * fScale;
      const microPeriod = ringAspect * microScale;
      for (let i = 0; i < w * h; i++) {
        const hgt = this.heightMap ? this.heightMap[i] : 0.5;
        const heightMul = (0.85 + 0.3 * Math.pow(hgt, 1.2)) * heightScale;

        // Large-scale dark regions multiplier
        let featureMul = 1.0;
        let x = 0;
        let y = 0;
        if (useFeatures || mountainStrength > 0 || isArtificial) {
          x = i % w;
          y = (i - x) / w;
        }
        if (useFeatures) {
          const nx = ((x / w) * ringAspect + fOffX) * fScale;
          const ny = (y / h + fOffY) * (fScale * 0.5);
          let v = fbm(nx, ny, 4, 2.0, 0.5, featurePeriod); // 0..1
          v = Math.max(0, Math.min(1, v));
          // Stronger, broader mask: shift and scale before contrast
          let level = (v - 0.1) / 0.5; // maps 0.1->0 and 0.6->1
          if (level < 0) level = 0; else if (level > 1) level = 1;
          const shaped = Math.pow(level, Math.max(0.0001, fContrast));
          const maskStrength = Math.max(0, Math.min(1, fStrength * featureMask));
          featureMul = 1 - maskStrength * shaped;
          if (featureMul < 0) featureMul = 0;
        }

        const idx = i * 4;
        let metalMul = 1;
        if (isArtificial) {
          const stripe = Math.sin((y / h) * stripeScale * Math.PI * 2 + stripePhase) * 0.06;
          const mx = (x / w) * microScale * ringAspect + microPhase;
          const my = (y / h) * microScale + microPhase;
          const micro = ((usePeriodic && microPeriod)
            ? value2Periodic(mx, my, microPeriod)
            : value2(mx, my)) - 0.5;
          const microScaled = micro * 0.08;
          metalMul = 1 + stripe + microScaled;
          if (metalMul < 0.88) metalMul = 0.88;
          if (metalMul > 1.18) metalMul = 1.18;
        }
        const mul = Math.max(0, heightMul * featureMul * shadeBias * metalMul);
        let r = Math.min(255, Math.floor(tdata[idx] * mul));
        let g = Math.min(255, Math.floor(tdata[idx + 1] * mul));
        let b = Math.min(255, Math.floor(tdata[idx + 2] * mul));
        if (mountainStrength > 0) {
          const m = smoothstep(mountainThreshold - 0.06, mountainThreshold + 0.03, hgt);
          if (m > 0) {
            const row = y * w;
            const left = this.heightMap[row + (x === 0 ? w - 1 : x - 1)];
            const right = this.heightMap[row + (x === w - 1 ? 0 : x + 1)];
            const up = this.heightMap[(y === 0 ? h - 1 : y - 1) * w + x];
            const down = this.heightMap[(y === h - 1 ? 0 : y + 1) * w + x];
            const slope = Math.min(1, Math.abs(right - left) + Math.abs(down - up));
            const ridge = smoothstep(0.02, 0.18, slope);
            const peakMix = (0.14 + 0.26 * m) * mountainStrength;
            const ridgeShade = (0.08 + 0.18 * ridge) * m * mountainStrength;
            r = Math.round(r + (235 - r) * peakMix);
            g = Math.round(g + (238 - g) * peakMix);
            b = Math.round(b + (244 - b) * peakMix);
            r = Math.floor(r * (1 - ridgeShade));
            g = Math.floor(g * (1 - ridgeShade));
            b = Math.floor(b * (1 - ridgeShade));
          }
        }
        tdata[idx] = r;
        tdata[idx + 1] = g;
        tdata[idx + 2] = b;
      }
      ctx.putImageData(timg, 0, 0);
    } catch (e) {}

    if (!this.heightMap || !this.heightZoneHists || !this._zoneRowIndex) {
      if (!this._zoneRowIndex) {
        this._zoneRowIndex = this.buildZoneRowIndex(h);
      }
      if (!this.heightMap) this.generateHeightMap(w, h);
    }

    const ocean = document.createElement('canvas');
    ocean.width = w; ocean.height = h;
    const octx = ocean.getContext('2d');
    const oimg = octx.createImageData(w, h);
    const odata = oimg.data;
    const zc = this.viz.zonalCoverage || {};
    const covW = [
      Math.max(0, Math.min(1, (zc.tropical?.water ?? 0))),
      Math.max(0, Math.min(1, (zc.temperate?.water ?? 0))),
      Math.max(0, Math.min(1, (zc.polar?.water ?? 0))),
    ];
    const thrIdx = [0, 0, 0];
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
      thrIdx[zi] = k;
    }
    const waterEdgeSoftness = 0.06;
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
      const thr = thrIdx[zi];
      let a = 0;
      if (thr >= 0) {
        const hgt = this.heightMap ? this.heightMap[i] : 1;
        const thrVal = thr / 255;
        const lower = Math.max(0, thrVal - waterEdgeSoftness);
        const upper = Math.min(1, thrVal + waterEdgeSoftness);
        a = 1 - smoothstep(lower, upper, hgt);
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

    const iceCanvas = document.createElement('canvas');
    iceCanvas.width = w; iceCanvas.height = h;
    const ictx = iceCanvas.getContext('2d');
    const iimg = ictx.createImageData(w, h);
    const idata = iimg.data;
    const zonalCoverage = this.viz.zonalCoverage || {};
    const zonalSets = [
      zonalCoverage.tropical || {},
      zonalCoverage.temperate || {},
      zonalCoverage.polar || {},
    ];
    const zoneIceFracs = zonalSets.map(set => {
      const v = Number(set.ice || 0);
      if (v <= 0) return 0;
      if (v >= 1) return 1;
      return v;
    });
    const startFromPoles = zoneIceFracs[2] > zoneIceFracs[0];
    const iceNoise = this.getIceNoiseField(w, h);
    if (!this._iceScore || this._iceScore.length !== w * h) this._iceScore = new Float32Array(w * h);
    const iceScore = this._iceScore;
    const iceZoneHists = [
      { counts: new Uint32Array(256), total: 0 },
      { counts: new Uint32Array(256), total: 0 },
      { counts: new Uint32Array(256), total: 0 },
    ];
    const zoneRowIndex = this._zoneRowIndex;
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const zi = zoneRowIndex ? zoneRowIndex[y] : 0;
      const latAbs = isRing ? 0.5 : Math.min(1, Math.abs((y / (h - 1)) - 0.5) * 2);
      const latTerm = startFromPoles ? (1 - latAbs) : latAbs;
      const latBias = Math.max(0, Math.min(1, Math.pow(latTerm, 0.85)));
      const idx = i * 4;
      const waterPresence = odata[idx + 3] / 255;
      const hgt = this.heightMap ? this.heightMap[i] : 0.5;
      let score = latBias * 0.58 + iceNoise[i] * 0.3 + (1 - hgt) * 0.14 - waterPresence * 0.05;
      if (score < 0) score = 0; else if (score > 1) score = 1;
      iceScore[i] = score;
      const hist = iceZoneHists[zi];
      const bin = Math.max(0, Math.min(255, Math.floor(score * 255)));
      hist.counts[bin]++;
      hist.total++;
    }
    const zoneThresholds = [0, 0, 0];
    for (let zi = 0; zi < 3; zi++) {
      const hist = iceZoneHists[zi];
      const target = Math.max(0, Math.min(1, zoneIceFracs[zi])) * hist.total;
      if (target <= 0 || hist.total === 0) {
        zoneThresholds[zi] = -1;
        continue;
      }
      let acc = 0;
      let thrVal = 1;
      for (let k = 0; k < 256; k++) {
        acc += hist.counts[k];
        if (acc >= target) {
          const prev = acc - hist.counts[k];
          const remain = target - prev;
          const ratio = hist.counts[k] ? Math.max(0, Math.min(1, remain / hist.counts[k])) : 0;
          thrVal = (k + ratio) / 255;
          break;
        }
      }
      zoneThresholds[zi] = Math.max(0, Math.min(1, thrVal));
    }
    const tropicalEdge = 23.5 / 90;
    const polarEdge = 66.5 / 90;
    const zoneBlend = 0.06;
    const softness = 0.08;
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      let weights = null;
      if (isRing) {
        weights = [1, 0, 0];
      } else {
        const latAbs = Math.min(1, Math.abs((y / (h - 1)) - 0.5) * 2);
        let w0 = 1 - smoothstep(tropicalEdge - zoneBlend, tropicalEdge + zoneBlend, latAbs);
        let w2 = smoothstep(polarEdge - zoneBlend, polarEdge + zoneBlend, latAbs);
        let w1 = 1 - w0 - w2;
        if (w1 < 0) w1 = 0;
        const sum = w0 + w1 + w2;
        if (sum > 0) {
          const inv = 1 / sum;
          w0 *= inv; w1 *= inv; w2 *= inv;
        }
        weights = [w0, w1, w2];
      }
      let alphaSum = 0;
      let weightSum = 0;
      for (let zi = 0; zi < 3; zi++) {
        const thr = zoneThresholds[zi];
        const weight = weights[zi];
        if (thr < 0 || weight <= 0) continue;
        weightSum += weight;
        const lower = Math.max(0, thr - softness);
        const upper = Math.min(1, thr + softness);
        const zoneAlpha = 1 - smoothstep(lower, upper, iceScore[i]);
        alphaSum += zoneAlpha * weight;
      }
      let alpha = 0;
      if (weightSum > 0) alpha = alphaSum / weightSum;
      if (alpha < 0.02) alpha = 0;
      if (alpha > 1) alpha = 1;
      const idx = i * 4;
      idata[idx] = 200;
      idata[idx + 1] = 220;
      idata[idx + 2] = 255;
      idata[idx + 3] = Math.floor(alpha * 255);
    }
    ictx.putImageData(iimg, 0, 0);
    ctx.drawImage(iceCanvas, 0, 0);

    const zcLife = this.viz.zonalCoverage || {};
    const bAny = ((zcLife.tropical?.life || 0) + (zcLife.temperate?.life || 0) + (zcLife.polar?.life || 0)) > 0;
    if (bAny) {
      const bioCanvas = document.createElement('canvas');
      bioCanvas.width = w; bioCanvas.height = h;
      const bctx = bioCanvas.getContext('2d');
      const bimg = bctx.createImageData(w, h);
      const bdata = bimg.data;
      const bioSeed = this.hashSeedFromPlanet();
      const bioSeedVal = Math.floor((bioSeed.x * 65535) ^ (bioSeed.y * 131071)) >>> 0;
      const bioHash = (x, y) => {
        const n = Math.sin(x * 12.9898 + y * 78.233 + bioSeedVal * 0.00011) * 43758.5453;
        return n - Math.floor(n);
      };
      const patchNoise = (x, y) => {
        const scale = 0.07;
        const warp = (bioHash(x * 0.18, y * 0.18) - 0.5) * 1.2;
        const warp2 = (bioHash(x * 0.18 + 41.7, y * 0.18 - 19.3) - 0.5) * 1.2;
        const px = (x + warp) * scale;
        const py = (y + warp2) * scale;
        const xi = Math.floor(px);
        const yi = Math.floor(py);
        const xf = px - xi;
        const yf = py - yi;
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        const a = bioHash(xi, yi);
        const b = bioHash(xi + 1, yi);
        const c = bioHash(xi, yi + 1);
        const d = bioHash(xi + 1, yi + 1);
        const base = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
        const detail = bioHash(x * 0.38 + base * 5.2, y * 0.38 - base * 4.1);
        return Math.max(0, Math.min(1, base * 0.9 + detail * 0.1));
      };
      const lifeFracs = [
        Math.max(0, Math.min(1, (zcLife.tropical?.life || 0))),
        Math.max(0, Math.min(1, (zcLife.temperate?.life || 0))),
        Math.max(0, Math.min(1, (zcLife.polar?.life || 0))),
      ];
      const lifeNoise = this.getLifeNoiseField(w, h);
      if (!this._lifeScore || this._lifeScore.length !== w * h) this._lifeScore = new Float32Array(w * h);
      const lifeScore = this._lifeScore;
      const lifeZoneHists = [
        { counts: new Uint32Array(256), total: 0 },
        { counts: new Uint32Array(256), total: 0 },
        { counts: new Uint32Array(256), total: 0 },
      ];
      let mountainThreshold = 1;
      if (!isArtificial) {
        const hist0 = this.heightZoneHists[0];
        const hist1 = this.heightZoneHists[1];
        const hist2 = this.heightZoneHists[2];
        const total = hist0.total + hist1.total + hist2.total;
        const target = total * 0.92;
        let acc = 0;
        let thrBin = 255;
        for (let k = 0; k <= 255; k++) {
          acc += hist0.counts[k] + hist1.counts[k] + hist2.counts[k];
          if (acc >= target) { thrBin = k; break; }
        }
        mountainThreshold = thrBin / 255;
      }
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const x = i - y * w;
        const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
        const thr = thrIdx[zi];
        if (thr >= 0) {
          const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
          if (hbin <= thr) continue;
        }
        const idx = i * 4;
        const waterPresence = odata[idx + 3] / 255;
        const latAbs = isRing ? 0.5 : Math.min(1, Math.abs((y / (h - 1)) - 0.5) * 2);
        const hgt = this.heightMap ? this.heightMap[i] : 0.5;
        const patch = patchNoise(x, y);
        let score = lifeNoise[i] * 0.55 + patch * 0.25 + (1 - latAbs) * 0.1 + (1 - hgt) * 0.05 - waterPresence * 0.35;
        if (score < 0) score = 0; else if (score > 1) score = 1;
        lifeScore[i] = score;
        const hist = lifeZoneHists[zi];
        const bin = Math.max(0, Math.min(255, Math.floor(score * 255)));
        hist.counts[bin]++;
        hist.total++;
      }
      const zoneThresholds = [0, 0, 0];
      for (let zi = 0; zi < 3; zi++) {
        const hist = lifeZoneHists[zi];
        const target = Math.max(0, Math.min(1, lifeFracs[zi])) * hist.total;
        if (target <= 0 || hist.total === 0) {
          zoneThresholds[zi] = -1;
          continue;
        }
        let acc = 0;
        let thrVal = 0;
        for (let k = 255; k >= 0; k--) {
          acc += hist.counts[k];
          if (acc >= target) {
            const prev = acc - hist.counts[k];
            const remain = target - prev;
            const ratio = hist.counts[k] ? Math.max(0, Math.min(1, remain / hist.counts[k])) : 0;
            thrVal = (k + (1 - ratio)) / 255;
            break;
          }
        }
        zoneThresholds[zi] = Math.max(0, Math.min(1, thrVal));
      }
      const softness = 0.1;
      for (let i = 0; i < w * h; i++) {
        const y = Math.floor(i / w);
        const x = i - y * w;
        const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
        const lifeFrac = lifeFracs[zi];
        if (lifeFrac <= 0) continue;
        const thr = thrIdx[zi];
        if (thr >= 0) {
          const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
          if (hbin <= thr) continue;
        }
        const idx = i * 4;
        let alpha = 0;
        if (lifeFrac >= 1) {
          alpha = 1;
        } else {
          const thresh = Math.max(0, zoneThresholds[zi] - 0.02);
          if (thresh < 0) continue;
          const lower = Math.max(0, thresh - softness);
          const upper = Math.min(1, thresh + softness);
          alpha = smoothstep(lower, upper, lifeScore[i]);
        }
        const alphaScale = 0.15 + 0.85 * lifeFrac;
        alpha = Math.max(0, Math.min(1, alpha * alphaScale));
        if (alpha < 0.00001) continue;
        const baseR = 24;
        const baseG = 105;
        const baseB = 58;
        const hgt = this.heightMap ? this.heightMap[i] : 0.5;
        const coarse = Math.pow(lifeNoise[i], 1.6);
        const micro = bioHash(x * 2, y * 2);
        const tone = Math.max(0, Math.min(1, 0.1 + 0.9 * (0.55 * coarse + 0.25 * (1 - hgt) + 0.2 * micro)));
        const messyR = Math.floor(34 * (1 - tone) + 12 * tone);
        const messyG = Math.floor(110 * (1 - tone) + 150 * tone);
        const messyB = Math.floor(78 * (1 - tone) + 44 * tone);
        const messiness = 0.2 + 0.8 * lifeFrac;
        let r = Math.floor(baseR * (1 - messiness) + messyR * messiness);
        let g = Math.floor(baseG * (1 - messiness) + messyG * messiness);
        let b = Math.floor(baseB * (1 - messiness) + messyB * messiness);
        const grain = 0.88 + 0.18 * micro * messiness;
        const densityNoise = 0.55 * coarse + 0.45 * patchNoise(x + 61.7, y - 38.4);
        const density = Math.max(0, Math.min(1, 0.2 + 0.8 * Math.pow(densityNoise, 1.5)));
        alpha = Math.max(0, Math.min(0.75, alpha * grain));
        const shade = 0.6 + 0.4 * density;
        r = Math.floor(r * shade);
        g = Math.floor(g * shade);
        b = Math.floor(b * shade);
        if (!isArtificial) {
          const peakMask = smoothstep(mountainThreshold - 0.05, mountainThreshold + 0.02, hgt);
          alpha *= (1 - 0.7 * peakMask);
        }
        const iceCover = idata[idx + 3] / 255;
        if (iceCover > 0) {
          alpha = Math.max(alpha, iceCover);
        }
        bdata[idx] = r;
        bdata[idx + 1] = g;
        bdata[idx + 2] = b;
        bdata[idx + 3] = Math.floor(alpha * 255);
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
  };

  PlanetVisualizer.prototype.generateLavaOverlayTexture = function generateLavaOverlayTexture(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const ringAspect = this.getRingUvAspect();
    const lavaSeed = this.hashSeedFromPlanet();
    const seedValue = Math.floor((lavaSeed.x * 131071) ^ (lavaSeed.y * 262147)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + seedValue * 0.00013) * 43758.5453;
      return n - Math.floor(n);
    };
    const ridgeNoise = (x, y, scale) => {
      const sx = x * scale;
      const sy = y * scale;
      const coarse = hash(sx, sy);
      const detail = hash(sx * 2.3 + 19.7, sy * 2.3 - 11.2);
      const mixed = coarse * 0.68 + detail * 0.32;
      return 1 - Math.abs(mixed * 2 - 1);
    };
    const patchNoise = (x, y, scale) => {
      const sx = x * scale;
      const sy = y * scale;
      const broad = hash(sx, sy);
      const warped = hash(sx * 1.4 - 8.1, sy * 1.4 + 5.7);
      return clamp01(broad * 0.7 + warped * 0.3);
    };
    const basalt = { r: 34, g: 11, b: 8 };
    const lavaRed = { r: 176, g: 30, b: 12 };
    const lavaOrange = { r: 234, g: 94, b: 18 };
    const lavaYellow = { r: 255, g: 196, b: 84 };
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = (i - x) / w;
      const idx = i * 4;
      const hgt = this.heightMap ? this.heightMap[i] : 0.5;
      const lowland = 1 - smoothstep(0.42, 0.82, hgt);
      const fissure = ridgeNoise((x / w) * ringAspect, y / h, 8.5);
      const patch = smoothstep(0.42, 0.82, patchNoise((x / w) * ringAspect + 3.4, y / h - 1.8, 3.2));
      const patchDetail = smoothstep(0.46, 0.8, patchNoise((x / w) * ringAspect - 11.2, y / h + 7.6, 5.1));
      const crackMask = clamp01(fissure * 0.48 + patch * 0.38 + patchDetail * 0.14);
      const moltenMask = clamp01(lowland * 0.58 + crackMask * 0.82 + patch * 0.18);
      const crustBlend = clamp01(0.5 + lowland * 0.2 + crackMask * 0.14);
      const redBlend = clamp01(smoothstep(0.12, 0.82, moltenMask));
      const orangeBlend = clamp01(smoothstep(0.32, 0.9, moltenMask));
      const yellowBlend = clamp01(smoothstep(0.78, 1, moltenMask));

      let r = 0;
      let g = 0;
      let b = 0;
      r += basalt.r * crustBlend;
      g += basalt.g * crustBlend;
      b += basalt.b * crustBlend;
      r += lavaRed.r * redBlend * 0.95;
      g += lavaRed.g * redBlend * 0.95;
      b += lavaRed.b * redBlend * 0.95;
      r += lavaOrange.r * orangeBlend * 0.72;
      g += lavaOrange.g * orangeBlend * 0.72;
      b += lavaOrange.b * orangeBlend * 0.72;
      r += lavaYellow.r * yellowBlend * 0.38;
      g += lavaYellow.g * yellowBlend * 0.38;
      b += lavaYellow.b * yellowBlend * 0.38;

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  };

  PlanetVisualizer.prototype.generateGasOverlayTexture = function generateGasOverlayTexture(w, h, state) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const ringAspect = this.getRingUvAspect();
    const gasSeed = this.hashSeedFromPlanet();
    const seedValue = Math.floor((gasSeed.x * 917519) ^ (gasSeed.y * 655357)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + seedValue * 0.00019) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrapIndex = (idx, period) => {
      const p = Math.max(1, Math.round(period));
      let v = idx % p;
      if (v < 0) v += p;
      return v;
    };
    const value2 = (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = smooth(xf);
      const v = smooth(yf);
      const a = hash(xi, yi);
      const b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1);
      const d = hash(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const value2Periodic = (x, y, period) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = smooth(xf);
      const v = smooth(yf);
      const x0 = wrapIndex(xi, period);
      const x1 = wrapIndex(xi + 1, period);
      const a = hash(x0, yi);
      const b = hash(x1, yi);
      const c = hash(x0, yi + 1);
      const d = hash(x1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const usePeriodic = this.isRingWorld();
    const sample = (x, y, period) => (usePeriodic && period ? value2Periodic(x, y, period) : value2(x, y));
    const bandPeriod = ringAspect * 5.2;
    const stormPeriod = ringAspect * 9.4;
    const spotCx = 0.72 + (hash(11.2, 7.4) - 0.5) * 0.08;
    const spotCy = 0.60 + (hash(3.6, 19.1) - 0.5) * 0.06;
    const spotRx = 0.11 + hash(1.7, 2.8) * 0.04;
    const spotRy = 0.045 + hash(5.1, 9.3) * 0.02;

    const hydrogenLight = { r: 238, g: 221, b: 199 };
    const hydrogenMid = { r: 203, g: 174, b: 142 };
    const hydrogenDark = { r: 147, g: 108, b: 79 };
    const warmBeltTint = { r: 196, g: 136, b: 92 };
    const methaneTint = { r: 142, g: 152, b: 164 };
    const ammoniaTint = { r: 249, g: 246, b: 241 };
    const stormTint = { r: 214, g: 145, b: 74 };

    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = (i - x) / w;
      const idx = i * 4;
      const u = x / Math.max(1, w - 1);
      const v = y / Math.max(1, h - 1);
      const lat = (v - 0.5) * 2;
      const latAbs = Math.abs(lat);
      const hydrogenBandGate = smoothstep(0.35, 0.75, state.hydrogenStrength);
      const chemistryStrength = clamp01(
        (state.methaneStrength * 0.58 + state.ammoniaStrength * 0.72) * hydrogenBandGate
      );
      const pureHydrogenStrength = state.hydrogenStrength * (1 - chemistryStrength);
      const polarFade = 1 - smoothstep(0.8, 0.95, latAbs);
      const polarBlend = smoothstep(0.72, 0.96, latAbs);

      const baseBroad = sample(u * ringAspect * 0.85 + 2.6, v * 1.4 + 4.9, bandPeriod * 0.18);
      const baseSoft = sample(u * ringAspect * 2.0 - 3.1, v * 2.3 + 7.8, bandPeriod * 0.4);
      const baseMarble = sample(u * ringAspect * 3.2 + 9.4, v * 3.8 - 2.7, bandPeriod * 0.62);
      const roughA = sample(u * ringAspect * 12.8 + 13.4, v * 15.2 - 7.6, bandPeriod * 2.2);
      const roughB = sample(u * ringAspect * 24.4 - 18.1, v * 31.5 + 5.7, bandPeriod * 5.1);
      const roughC = sample(u * ringAspect * 37.2 + 6.3, v * 43.8 - 14.9, bandPeriod * 7.8);
      const roughMix = clamp01(0.5 * roughA + 0.32 * roughB + 0.18 * roughC);
      const roughMask = smoothstep(0.18, 0.92, roughMix);
      const hydrogenBase = clamp01(
        0.52
        + (baseBroad - 0.5) * 0.18
        + (baseSoft - 0.5) * 0.1
        + (baseMarble - 0.5) * 0.06
        + (roughMix - 0.5) * 0.06
      );

      const beltPhase = lat * Math.PI * (2.8 + chemistryStrength * 2.1);
      const belts = Math.sin(beltPhase + seedValue * 0.0000021) * 0.5 + 0.5;
      const broad = sample(u * ringAspect * 1.7 + 2.1, v * 2.8 + 6.2, bandPeriod * 0.33);
      const fine = sample(u * ringAspect * 13.5 - 14.4, v * 16.8 + 3.7, bandPeriod * 2.8);
      const streak = sample(u * ringAspect * 22.5 + 17.3, v * 26.4 - 9.2, bandPeriod * 4.6);
      const eddy = sample(u * ringAspect * 8.4 - 5.6, v * 10.1 + 4.8, bandPeriod * 1.75);
      const messyBreakup = sample(u * ringAspect * 5.2 - 7.7, v * 6.4 + 12.1, bandPeriod * 0.92);
      const swirlFieldA = sample(u * ringAspect * 9.6 + 7.1, v * 11.8 - 5.2, bandPeriod * 1.85) - 0.5;
      const swirlFieldB = sample(u * ringAspect * 16.4 - 12.7, v * 18.2 + 9.3, bandPeriod * 3.1) - 0.5;
      const swirlCurl = Math.sin((u * ringAspect * 9.1 + swirlFieldA * 5.2 + swirlFieldB * 3.8) * Math.PI);
      const shear = (swirlFieldA * 0.58 + swirlFieldB * 0.42) * (0.32 + chemistryStrength * 0.52);
      const swirlMask = clamp01(0.5 + swirlCurl * 0.22 + shear * 0.28);
      const edgeSwirlA = sample(u * ringAspect * 24.8 + 5.4, v * 28.7 - 9.1, bandPeriod * 4.6) - 0.5;
      const edgeSwirlB = sample(u * ringAspect * 37.6 - 18.3, v * 42.1 + 14.8, bandPeriod * 7.4) - 0.5;
      const edgeSwirlMask = clamp01(0.5 + edgeSwirlA * 0.42 + edgeSwirlB * 0.34 + swirlCurl * 0.12);
      const beltBase = clamp01(
        belts * 0.3
        + broad * 0.18
        + fine * 0.08
        + streak * 0.08
        + messyBreakup * 0.18
        + swirlMask * 0.12
      );
      const beltContrastRaw = clamp01((beltBase - 0.5) * (1 + chemistryStrength * 0.95) + 0.5);
      const beltContrast = smoothstep(0.16, 0.84, Math.pow(beltContrastRaw, 0.78));
      const brightBandMask = smoothstep(0.58 - chemistryStrength * 0.04, 0.9, beltContrast) * chemistryStrength * polarFade;
      const darkBandMask = smoothstep(0.22, 0.66 + chemistryStrength * 0.04, 1 - beltContrast) * chemistryStrength * polarFade;
      const vortexA = sample(u * ringAspect * 28.5 + 1.7, v * 31.4 - 8.6, bandPeriod * 5.5);
      const vortexB = sample(u * ringAspect * 41.2 - 14.1, v * 38.7 + 13.3, bandPeriod * 7.2);
      const crispDetail = sample(u * ringAspect * 56.8 + 22.7, v * 63.4 - 18.9, bandPeriod * 10.4);
      const crispDetailB = sample(u * ringAspect * 73.2 - 9.6, v * 81.1 + 14.5, bandPeriod * 13.6);
      const crispMask = smoothstep(0.5, 0.82, clamp01(crispDetail * 0.56 + crispDetailB * 0.44));
      const edgeBand = clamp01(1 - Math.abs(beltContrast - 0.5) * 2.4);
      const turbulence = clamp01(
        0.16 * fine
        + 0.1 * streak
        + 0.08 * eddy
        + 0.12 * roughMix
        + 0.08 * swirlMask
        + 0.1 * vortexA
        + 0.14 * crispMask
        + 0.22 * edgeSwirlMask * edgeBand
      );
      const roughTurbulence = (roughMask - 0.5) * (0.08 + chemistryStrength * 0.08);
      const hydrogenBands = clamp01(
        hydrogenBase
        + (beltContrast - 0.5) * 0.42 * chemistryStrength
        + (turbulence - 0.5) * 0.1 * chemistryStrength
        + (swirlMask - 0.5) * 0.04 * chemistryStrength
        + (edgeSwirlMask - 0.5) * 0.1 * chemistryStrength * edgeBand
        + (crispMask - 0.5) * 0.08 * chemistryStrength
        + roughTurbulence
      );
      const smoothHydrogenBase = clamp01(0.58 + (baseBroad - 0.5) * 0.08 + (baseSoft - 0.5) * 0.04 + (roughA - 0.5) * 0.03);
      const hydrogenBandsSmoothed = clamp01(
        hydrogenBands * (1 - pureHydrogenStrength)
        + smoothHydrogenBase * pureHydrogenStrength
      );
      const polarHydrogenBase = clamp01(0.56 + (baseBroad - 0.5) * 0.1 + (roughA - 0.5) * 0.04);
      const hydrogenBandsFinal = clamp01(hydrogenBandsSmoothed * (1 - polarBlend) + polarHydrogenBase * polarBlend);

      let r = Math.round(hydrogenDark.r + (hydrogenMid.r - hydrogenDark.r) * hydrogenBandsFinal);
      let g = Math.round(hydrogenDark.g + (hydrogenMid.g - hydrogenDark.g) * hydrogenBandsFinal);
      let b = Math.round(hydrogenDark.b + (hydrogenMid.b - hydrogenDark.b) * hydrogenBandsFinal);

      const brightMix = 0.06 + 0.72 * brightBandMask + roughMask * 0.02 + crispMask * 0.08;
      r = Math.round(r + (hydrogenLight.r - r) * brightMix);
      g = Math.round(g + (hydrogenLight.g - g) * brightMix);
      b = Math.round(b + (hydrogenLight.b - b) * brightMix);

      const warmBeltMix = darkBandMask * (0.18 + 0.22 * turbulence + 0.07 * roughMask + 0.1 * crispMask);
      r = Math.round(r + (warmBeltTint.r - r) * warmBeltMix);
      g = Math.round(g + (warmBeltTint.g - g) * warmBeltMix);
      b = Math.round(b + (warmBeltTint.b - b) * warmBeltMix);

      const methanePhase = (lat - 0.08) * Math.PI * (2.6 + chemistryStrength * 1.8) + 0.9;
      const methaneWave = Math.sin(methanePhase) * 0.5 + 0.5;
      const methaneNoise = sample(u * ringAspect * 6.8 - 12.6, v * 8.9 + 3.4, bandPeriod * 1.36);
      const methaneSwirl = sample(u * ringAspect * 15.4 + 4.6, v * 19.8 - 16.1, bandPeriod * 3.2);
      const methaneBelts = clamp01(
        darkBandMask * 0.2
        + methaneWave * 0.18
        + methaneNoise * 0.18
        + methaneSwirl * 0.14
        + swirlMask * 0.08
        + edgeSwirlMask * 0.14 * edgeBand
        + vortexA * 0.08
        + latAbs * 0.04
      );
      const methaneMix = state.methaneStrength * hydrogenBandGate * smoothstep(0.66, 0.9, methaneBelts) * (0.08 + 0.1 * turbulence + 0.12 * roughMask + 0.12 * swirlMask + 0.08 * crispMask) * polarFade;
      r = Math.round(r + (methaneTint.r - r) * methaneMix);
      g = Math.round(g + (methaneTint.g - g) * methaneMix);
      b = Math.round(b + (methaneTint.b - b) * methaneMix);

      const ammoniaPhase = (lat + 0.24) * Math.PI * (3.1 + chemistryStrength * 1.15) + 1.7;
      const ammoniaWave = Math.sin(ammoniaPhase) * 0.5 + 0.5;
      const ammoniaNoise = sample(u * ringAspect * 7.9 + 16.2, v * 9.7 - 11.4, stormPeriod * 1.18);
      const ammoniaSwirl = sample(u * ringAspect * 18.8 - 3.2, v * 22.6 + 8.4, stormPeriod * 2.6);
      const ammoniaLane = clamp01(
        ammoniaWave * 0.24
        + ammoniaNoise * 0.18
        + ammoniaSwirl * 0.22
        + swirlMask * 0.08
        + edgeSwirlMask * 0.16 * edgeBand
        + vortexB * 0.12
      );
      const methaneSuppression = 1 - smoothstep(0.42, 0.88, methaneBelts);
      const ammoniaBands = clamp01(
        sample(u * ringAspect * 4.5 + 9.3, v * 5.9 - 2.4, stormPeriod * 0.78) * 0.08
        + brightBandMask * 0.06
        + ammoniaLane * 0.58
        + methaneSuppression * 0.08
      );
      const ammoniaMix = state.ammoniaStrength * hydrogenBandGate * smoothstep(0.72, 0.88, ammoniaBands) * (0.22 + 0.2 * (1 - latAbs) + 0.1 * roughMask + 0.14 * crispMask) * polarFade;
      r = Math.round(r + (ammoniaTint.r - r) * ammoniaMix);
      g = Math.round(g + (ammoniaTint.g - g) * ammoniaMix);
      b = Math.round(b + (ammoniaTint.b - b) * ammoniaMix);

      const dx = (u - spotCx) / Math.max(0.0001, spotRx);
      const dy = (v - spotCy) / Math.max(0.0001, spotRy);
      const spotBase = clamp01(1 - (dx * dx + dy * dy));
      const spotNoise = sample(u * ringAspect * 11.2 + 21.4, v * 13.7 - 12.8, stormPeriod * 1.9);
      const stormMask = smoothstep(0.18, 0.88, spotBase * 0.78 + spotNoise * 0.22) * state.ammoniaStrength * chemistryStrength;
      if (stormMask > 0) {
        const stormGlow = 0.62 * stormMask;
        r = Math.round(r + (stormTint.r - r) * stormGlow);
        g = Math.round(g + (stormTint.g - g) * stormGlow);
        b = Math.round(b + (stormTint.b - b) * stormGlow);
      }

      const grain = (roughB - 0.5) * 18 + (roughC - 0.5) * 10 + (crispDetail - 0.5) * 12;
      r = Math.max(0, Math.min(255, Math.round(r + grain)));
      g = Math.max(0, Math.min(255, Math.round(g + grain * 0.82)));
      b = Math.max(0, Math.min(255, Math.round(b + grain * 0.66)));

      const localContrast = 1 + crispMask * 0.18 + chemistryStrength * 0.08;
      r = Math.max(0, Math.min(255, Math.round((r - 128) * localContrast + 128)));
      g = Math.max(0, Math.min(255, Math.round((g - 128) * localContrast + 128)));
      b = Math.max(0, Math.min(255, Math.round((b - 128) * localContrast + 128)));

      const alphaBase = 0.84 + brightBandMask * 0.08 + stormMask * 0.18;
      const alphaFloor = Math.max(
        smoothstep(0.72, 1, state.hydrogenStrength) * (0.92 + 0.07 * pureHydrogenStrength),
        smoothstep(0.82, 1, state.overlayStrength) * 0.96
      );
      const alpha = Math.max(
        alphaFloor,
        clamp01(alphaBase * (0.42 + 0.9 * state.overlayStrength))
      );
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(alpha * 255);
    }

    ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  };

  PlanetVisualizer.prototype.generateWaterMask = function generateWaterMask(w, h) {
    const seed = this.hashSeedFromPlanet();
    const ringAspect = this.getRingUvAspect();
    const usePeriodic = this.isRingWorld();
    let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
    const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.0001) * 43758.5453;
      return n - Math.floor(n);
    };
    const wrapIndex = (idx, period) => {
      const p = Math.max(1, Math.round(period));
      let v = idx % p;
      if (v < 0) v += p;
      return v;
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
    const noise2Periodic = (x, y, period) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const x0 = wrapIndex(xi, period);
      const x1 = wrapIndex(xi + 1, period);
      const a = hash(x0, yi), b = hash(x1, yi);
      const c = hash(x0, yi + 1), d = hash(x1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const fbm = (x, y, periodBase = 0) => {
      let f = 0, amp = 0.5, freq = 1.0;
      for (let o = 0; o < 5; o++) {
        const px = x * freq;
        const py = y * freq;
        const period = periodBase ? periodBase * freq : 0;
        f += amp * (usePeriodic && period ? noise2Periodic(px, py, period) : noise2(px, py));
        freq *= 2; amp *= 0.5;
      }
      return f;
    };
    const scale = 3.0;
    const periodBase = scale * ringAspect;
    const arr = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * scale * ringAspect;
        const ny = (y / h) * (scale * 0.5);
        let v = fbm(nx, ny, periodBase);
        v = Math.min(1, Math.max(0, v));
        arr[y * w + x] = v;
      }
    }
    return arr;
  };

  PlanetVisualizer.prototype.getIceNoiseField = function getIceNoiseField(w, h) {
    const cached = this._iceNoise;
    if (cached?.w === w && cached?.h === h && cached.data) return cached.data;
    const seed = this.hashSeedFromPlanet();
    const ringAspect = this.getRingUvAspect();
    const usePeriodic = this.isRingWorld();
    let s = Math.floor((seed.x * 131071) ^ (seed.y * 524287)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 157.3 + y * 289.1 + s * 0.00017) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrapIndex = (idx, period) => {
      const p = Math.max(1, Math.round(period));
      let v = idx % p;
      if (v < 0) v += p;
      return v;
    };
    const value2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const a = hash(xi, yi);
      const b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1);
      const d = hash(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const value2Periodic = (x, y, period) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const x0 = wrapIndex(xi, period);
      const x1 = wrapIndex(xi + 1, period);
      const a = hash(x0, yi);
      const b = hash(x1, yi);
      const c = hash(x0, yi + 1);
      const d = hash(x1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const fbm = (x, y, oct = 4, lac = 2.15, gain = 0.45, periodBase = 0) => {
      let f = 0, amp = 0.5, freq = 1.0;
      for (let o = 0; o < oct; o++) {
        const px = x * freq;
        const py = y * freq;
        const period = periodBase ? periodBase * freq : 0;
        f += amp * (usePeriodic && period ? value2Periodic(px, py, period) : value2(px, py));
        freq *= lac;
        amp *= gain;
      }
      return f;
    };
    const arr = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const lat = Math.abs((y / (h - 1)) - 0.5) * 0.6;
      const periodBase = ringAspect * (2.6 + lat * 0.8);
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * (2.6 + lat * 0.8) * ringAspect;
        const ny = (y / h) * (1.3 + lat * 1.6);
        let v = fbm(nx + lat * 0.5, ny, 4, 2.1, 0.45, periodBase);
        if (v < 0) v = 0; else if (v > 1) v = 1;
        arr[y * w + x] = v;
      }
    }
    this._iceNoise = { w, h, data: arr };
    return arr;
  };

  PlanetVisualizer.prototype.getLifeNoiseField = function getLifeNoiseField(w, h) {
    const cached = this._lifeNoise;
    if (cached?.w === w && cached?.h === h && cached.data) return cached.data;
    const seed = this.hashSeedFromPlanet();
    const ringAspect = this.getRingUvAspect();
    const usePeriodic = this.isRingWorld();
    let s = Math.floor((seed.x * 91337) ^ (seed.y * 131543)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 119.9 + y * 301.1 + s * 0.00013) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrapIndex = (idx, period) => {
      const p = Math.max(1, Math.round(period));
      let v = idx % p;
      if (v < 0) v += p;
      return v;
    };
    const value2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const a = hash(xi, yi);
      const b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1);
      const d = hash(xi + 1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const value2Periodic = (x, y, period) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const x0 = wrapIndex(xi, period);
      const x1 = wrapIndex(xi + 1, period);
      const a = hash(x0, yi);
      const b = hash(x1, yi);
      const c = hash(x0, yi + 1);
      const d = hash(x1, yi + 1);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const fbm = (x, y, oct = 5, lac = 2.2, gain = 0.45, periodBase = 0) => {
      let f = 0, amp = 0.5, freq = 1.0;
      for (let o = 0; o < oct; o++) {
        const px = x * freq;
        const py = y * freq;
        const period = periodBase ? periodBase * freq : 0;
        f += amp * (usePeriodic && period ? value2Periodic(px, py, period) : value2(px, py));
        freq *= lac; amp *= gain;
      }
      return f;
    };
    const scale = 3.4;
    const periodBase = scale * ringAspect;
    const arr = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * scale * ringAspect;
        const ny = (y / h) * (scale * 0.6);
        let v = fbm(nx, ny, 5, 2.2, 0.45, periodBase);
        v = Math.min(1, Math.max(0, v));
        arr[y * w + x] = v;
      }
    }
    this._lifeNoise = { w, h, data: arr };
    return arr;
  };

  PlanetVisualizer.prototype.generateHeightMap = function generateHeightMap(w, h) {
    const seed = this.hashSeedFromPlanet();
    const ringAspect = this.getRingUvAspect();
    const usePeriodic = this.isRingWorld();
    let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
    const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.00013) * 43758.5453;
      return n - Math.floor(n);
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrapIndex = (idx, period) => {
      const p = Math.max(1, Math.round(period));
      let v = idx % p;
      if (v < 0) v += p;
      return v;
    };
    const value2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return lerp(lerp(a, b, u), lerp(c, d, u), v);
    };
    const value2Periodic = (x, y, period) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
      const x0 = wrapIndex(xi, period);
      const x1 = wrapIndex(xi + 1, period);
      const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
      return lerp(lerp(a, b, u), lerp(c, d, u), v);
    };
    const fbm = (x, y, oct = 5, lac = 2.0, gain = 0.5, periodBase = 0) => {
      let f = 0, amp = 0.5, freq = 1.0;
      for (let o = 0; o < oct; o++) {
        const px = x * freq;
        const py = y * freq;
        const period = periodBase ? periodBase * freq : 0;
        f += amp * (usePeriodic && period ? value2Periodic(px, py, period) : value2(px, py));
        freq *= lac; amp *= gain;
      }
      return f;
    };
    const ridged = (x, y, oct = 5, lac = 2.0, gain = 0.5, periodBase = 0) => {
      let f = 0, amp = 0.5, freq = 1.5;
      for (let o = 0; o < oct; o++) {
        const px = x * freq;
        const py = y * freq;
        const period = periodBase ? periodBase * freq : 0;
        const n = (usePeriodic && period) ? value2Periodic(px, py, period) : value2(px, py);
        const r = 1.0 - Math.abs(2 * n - 1);
        f += amp * (r * r);
        freq *= lac; amp *= gain;
      }
      return f;
    };

    const isRing = this.isRingWorld();
    const scaleBase = isRing ? 1.1 : 1.6;
    const scaleWarp = isRing ? 0.45 : 0.8;
    const scaleRidge = isRing ? 4.2 : 7.0;
    const periodWarp = ringAspect * scaleWarp;
    const periodBase = ringAspect * scaleBase;
    const periodRidge = ringAspect * scaleRidge;
    const arr = new Float32Array(w * h);
    let minH = Infinity, maxH = -Infinity;
    for (let y = 0; y < h; y++) {
      const vy = y / h;
      for (let x = 0; x < w; x++) {
        const vx = x / w;
        const vxs = vx * ringAspect;
        const wx = fbm(vxs * scaleWarp + 11.3, vy * scaleWarp + 5.7, 5, 2.0, 0.5, periodWarp);
        const wy = fbm(vxs * scaleWarp - 7.2, vy * scaleWarp - 3.9, 5, 2.0, 0.5, periodWarp);
        const ux = vxs * scaleBase + (wx - 0.5) * 0.8;
        const uy = vy * scaleBase + (wy - 0.5) * 0.4;
        const cont = fbm(ux, uy, 5, 2.0, 0.5, periodBase);
        const mont = ridged(ux * scaleRidge, uy * scaleRidge, 5, 2.0, 0.5, periodRidge);
        const contWeight = isRing ? 0.9 : 0.75;
        const ridgeWeight = isRing ? 0.3 : 0.5;
        let hgt = cont * contWeight + mont * ridgeWeight - 0.25;
        const lat = Math.abs(0.5 - vy) * 2;
        hgt += (0.15 * (0.5 - Math.abs(lat - 0.5)));
        minH = Math.min(minH, hgt); maxH = Math.max(maxH, hgt);
        arr[y * w + x] = hgt;
      }
    }
    const span = Math.max(1e-6, (maxH - minH));
    for (let i = 0; i < w * h; i++) arr[i] = (arr[i] - minH) / span;

    this.heightMap = arr;

    if (!this._zoneRowIndex) {
      this._zoneRowIndex = this.buildZoneRowIndex(h);
    }
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
  };
})();
