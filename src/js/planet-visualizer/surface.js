(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

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

  PlanetVisualizer.prototype.updateSurfaceTextureFromPressure = function updateSurfaceTextureFromPressure(force = false) {
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
    const sf = this.viz.surfaceFeatures || {};
    const fKey = `${sf.enabled ? '1' : '0'}_${Number(sf.strength || 0).toFixed(2)}_${Number(sf.scale || 0).toFixed(2)}_${Number(sf.contrast || 0).toFixed(2)}_${Number(sf.offsetX || 0).toFixed(2)}_${Number(sf.offsetY || 0).toFixed(2)}`;
    const key = `${factor.toFixed(2)}|${water.toFixed(2)}|${life.toFixed(2)}|${cloud.toFixed(2)}|${zKey}|${baseColorKey}|${fKey}`;
    if (!force && key === this.lastCraterFactorKey) return;
    this.lastCraterFactorKey = key;

    const tex = this.generateCraterTexture(factor);
    if (this.sphere && this.sphere.material) {
      this.sphere.material.map = tex;
      this.sphere.material.needsUpdate = true;
    }
  };

  PlanetVisualizer.prototype.generateCraterTexture = function generateCraterTexture(strength) {
    const w = 512;
    const h = 256;

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
      const zoneForV = (v) => {
        const latRad = (0.5 - v) * Math.PI;
        const absDeg = Math.abs(latRad * (180 / Math.PI));
        if (absDeg >= 66.5) return 2;
        if (absDeg >= 23.5) return 1;
        return 0;
      };
      this._zoneRowIndex = new Uint8Array(h);
      for (let y = 0; y < h; y++) {
        this._zoneRowIndex[y] = zoneForV(y / (h - 1));
      }
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

    const baseHex = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
    const seed = this.hashSeedFromPlanet ? this.hashSeedFromPlanet() : { x: 0.137, y: 0.733 };
    const planetType = resolvePlanetArchetype(this, baseHex);
    const palette = PLANET_TYPE_TEXTURES[planetType] || PLANET_TYPE_TEXTURES.default;
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

    if (strength > 0) {
      ctx.globalAlpha = Math.max(0, Math.min(1, strength));
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
      const value2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y, oct = 4, lac = 2.0, gain = 0.5) => {
        let f = 0, amp = 0.5, freq = 1.0;
        for (let o = 0; o < oct; o++) { f += amp * value2(x * freq, y * freq); freq *= lac; amp *= gain; }
        return f;
      };
      const feat = this.viz.surfaceFeatures || {};
      const fEnabled = !!feat.enabled;
      const fStrength = Math.max(0, Math.min(1, Number(feat.strength || 0)));
      const fScale = Math.max(0.05, Number(feat.scale || 0.7));
      const fContrast = Math.max(0, Number(feat.contrast || 1.2));
      const fOffX = Number(feat.offsetX || 0);
      const fOffY = Number(feat.offsetY || 0);

      for (let i = 0; i < w * h; i++) {
        const hgt = this.heightMap ? this.heightMap[i] : 0.5;
        const heightMul = (0.85 + 0.3 * Math.pow(hgt, 1.2)) * heightScale;

        // Large-scale dark regions multiplier
        let featureMul = 1.0;
        if (fEnabled && fStrength > 0) {
          const x = i % w;
          const y = (i - x) / w;
          const nx = (x / w + fOffX) * fScale;
          const ny = (y / h + fOffY) * (fScale * 0.5);
          let v = fbm(nx, ny, 4, 2.0, 0.5); // 0..1
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
        const mul = Math.max(0, heightMul * featureMul * shadeBias);
        tdata[idx] = Math.min(255, Math.floor(tdata[idx] * mul));
        tdata[idx + 1] = Math.min(255, Math.floor(tdata[idx + 1] * mul));
        tdata[idx + 2] = Math.min(255, Math.floor(tdata[idx + 2] * mul));
      }
      ctx.putImageData(timg, 0, 0);
    } catch (e) {}

    if (!this.heightMap || !this.heightZoneHists || !this._zoneRowIndex) {
      if (!this._zoneRowIndex) {
        const zoneForV = (v) => {
          const latRad = (0.5 - v) * Math.PI;
          const absDeg = Math.abs(latRad * (180 / Math.PI));
          if (absDeg >= 66.5) return 2;
          if (absDeg >= 23.5) return 1;
          return 0;
        };
        this._zoneRowIndex = new Uint8Array(h);
        for (let y = 0; y < h; y++) this._zoneRowIndex[y] = zoneForV(y / (h - 1));
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
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
      const thr = thrIdx[zi];
      let a = 0;
      if (thr >= 0) {
        const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
        if (hbin <= thr) {
          a = 1.0;
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

    const iceCanvas = document.createElement('canvas');
    iceCanvas.width = w; iceCanvas.height = h;
    const ictx = iceCanvas.getContext('2d');
    const iimg = ictx.createImageData(w, h);
    const idata = iimg.data;
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
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
        const thr = thrIdx[zi];
        if (thr >= 0) {
          const hbin = Math.max(0, Math.min(255, Math.floor((this.heightMap ? this.heightMap[i] : 1) * 255)));
          if (hbin <= thr) {
            continue;
          }
        }
        const idx = i * 4;
        const r = 30, g = 160, b = 80;
        bdata[idx] = r;
        bdata[idx + 1] = g;
        bdata[idx + 2] = b;
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
  };

  PlanetVisualizer.prototype.generateWaterMask = function generateWaterMask(w, h) {
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
    const scale = 3.0;
    const arr = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * scale;
        const ny = (y / h) * (scale * 0.5);
        let v = fbm(nx, ny);
        v = Math.min(1, Math.max(0, v));
        arr[y * w + x] = v;
      }
    }
    return arr;
  };

  PlanetVisualizer.prototype.generateHeightMap = function generateHeightMap(w, h) {
    const seed = this.hashSeedFromPlanet();
    let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
    const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + s * 0.00013) * 43758.5453;
      return n - Math.floor(n);
    };
    const lerp = (a, b, t) => a + (b - a) * t;
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
        const r = 1.0 - Math.abs(2 * n - 1);
        f += amp * (r * r);
        freq *= lac; amp *= gain;
      }
      return f;
    };

    const scaleBase = 1.6;
    const scaleWarp = 0.8;
    const scaleRidge = 7.0;
    const arr = new Float32Array(w * h);
    let minH = Infinity, maxH = -Infinity;
    for (let y = 0; y < h; y++) {
      const vy = y / h;
      for (let x = 0; x < w; x++) {
        const vx = x / w;
        const wx = fbm(vx * scaleWarp + 11.3, vy * scaleWarp + 5.7);
        const wy = fbm(vx * scaleWarp - 7.2, vy * scaleWarp - 3.9);
        const ux = vx * scaleBase + (wx - 0.5) * 0.8;
        const uy = vy * scaleBase + (wy - 0.5) * 0.4;
        const cont = fbm(ux, uy, 5, 2.0, 0.5);
        const mont = ridged(ux * scaleRidge, uy * scaleRidge, 5, 2.0, 0.5);
        let hgt = cont * 0.75 + mont * 0.5 - 0.25;
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
      this._zoneRowIndex = new Uint8Array(h);
      const zoneForV = (v) => {
        const latRad = (0.5 - v) * Math.PI; const absDeg = Math.abs(latRad * (180 / Math.PI));
        if (absDeg >= 66.5) return 2; if (absDeg >= 23.5) return 1; return 0;
      };
      for (let y = 0; y < h; y++) this._zoneRowIndex[y] = zoneForV(y / (h - 1));
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
