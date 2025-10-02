(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  const TYPE_SURFACE_PRESETS = {
    default: {
      highlight: '#ffffff',
      shadow: '#000000',
      highlightMix: 0.22,
      shadowMix: 0.35,
      highlightJitter: 0.08,
      shadowJitter: 0.12,
      tintStrength: 0,
      tintJitter: 0,
    },
    'mars-like': {
      highlight: '#f2c7a0',
      shadow: '#3c1410',
      highlightMix: 0.26,
      shadowMix: 0.42,
      highlightJitter: 0.08,
      shadowJitter: 0.1,
      tint: '#b65c3a',
      tintStrength: 0.05,
      tintJitter: 0.02,
    },
    'cold-desert': {
      highlight: '#f4e4c4',
      shadow: '#2f1f10',
      highlightMix: 0.28,
      shadowMix: 0.38,
      highlightJitter: 0.08,
      shadowJitter: 0.08,
      tint: '#c19a68',
      tintStrength: 0.06,
      tintJitter: 0.03,
    },
    'desiccated-desert': {
      highlight: '#f9ebd2',
      shadow: '#3a2514',
      highlightMix: 0.3,
      shadowMix: 0.4,
      highlightJitter: 0.1,
      shadowJitter: 0.1,
      tint: '#d1a86f',
      tintStrength: 0.07,
      tintJitter: 0.03,
    },
    'icy-moon': {
      highlight: '#edf4ff',
      shadow: '#223449',
      highlightMix: 0.42,
      shadowMix: 0.48,
      highlightJitter: 0.12,
      shadowJitter: 0.12,
      tint: '#7aa1c4',
      tintStrength: 0.08,
      tintJitter: 0.04,
    },
    'titan-like': {
      highlight: '#f7e9c3',
      shadow: '#2f1e06',
      highlightMix: 0.32,
      shadowMix: 0.46,
      highlightJitter: 0.08,
      shadowJitter: 0.09,
      tint: '#b88c3a',
      tintStrength: 0.08,
      tintJitter: 0.03,
    },
    'carbon-planet': {
      highlight: '#d0d6de',
      shadow: '#05080b',
      highlightMix: 0.22,
      shadowMix: 0.55,
      highlightJitter: 0.07,
      shadowJitter: 0.1,
      tint: '#2a2c39',
      tintStrength: 0.12,
      tintJitter: 0.05,
    },
    'super-earth': {
      highlight: '#e0f3e0',
      shadow: '#142c18',
      highlightMix: 0.35,
      shadowMix: 0.44,
      highlightJitter: 0.1,
      shadowJitter: 0.1,
      tint: '#3a7a40',
      tintStrength: 0.07,
      tintJitter: 0.03,
    },
    'venus-like': {
      highlight: '#fff1d2',
      shadow: '#311c08',
      highlightMix: 0.34,
      shadowMix: 0.45,
      highlightJitter: 0.09,
      shadowJitter: 0.09,
      tint: '#c59a4d',
      tintStrength: 0.07,
      tintJitter: 0.03,
    },
  };

  const clamp01 = (v) => (v < 0 ? 0 : (v > 1 ? 1 : v));

  const hexToRgb = (hex) => {
    const value = parseInt(hex.slice(1), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  };

  const hashStringToUint = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const uintToUnit = (value) => (value >>> 0) / 4294967295;

  const createRngFromKey = (key) => {
    let state = hashStringToUint(key) >>> 0;
    if (state === 0) state = 0x6d2b79f5;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 15), 1 | z);
      z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  };

  const encodeTypeOffsets = (str) => {
    let ox = 0;
    let oy = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((i & 1) === 0) {
        ox += code * (i + 1);
      } else {
        oy += code * (i + 1);
      }
    }
    return { x: ox, y: oy };
  };

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
    const typeKey = this.getCurrentArchetype() || 'default';
    const key = `${factor.toFixed(2)}|${water.toFixed(2)}|${life.toFixed(2)}|${cloud.toFixed(2)}|${zKey}|${typeKey}|${baseColorKey}|${fKey}`;
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
    const typeValue = this.getCurrentArchetype();
    const typeForNoise = typeValue || 'default';
    const planetSeed = this.hashSeedFromPlanet();
    const craterSeedKey = `${planetSeed.x.toFixed(6)}_${planetSeed.y.toFixed(6)}_${typeForNoise}`;

    if (!this._zoneRowIndex || this._zoneRowIndex.length !== h) {
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
    }

    if (!this.craterLayer || this.craterSeedKey !== craterSeedKey) {
      const craterCanvas = document.createElement('canvas');
      craterCanvas.width = w; craterCanvas.height = h;
      const cctx = craterCanvas.getContext('2d');
      const craterParamsBase = `${typeForNoise}|crater`;
      const densityMul = 0.85 + uintToUnit(hashStringToUint(`${craterParamsBase}|density`)) * 0.6;
      const sizeMul = 0.6 + uintToUnit(hashStringToUint(`${craterParamsBase}|size`)) * 1.0;
      const highlightBase = 0.05 + uintToUnit(hashStringToUint(`${craterParamsBase}|highlight`)) * 0.08;
      const shadowBase = 0.18 + uintToUnit(hashStringToUint(`${craterParamsBase}|shadow`)) * 0.14;
      const latBias = (uintToUnit(hashStringToUint(`${craterParamsBase}|lat`)) - 0.5) * 0.6;
      const rng = createRngFromKey(`${craterSeedKey}|rng`);
      const baseCount = 160 * densityMul;
      const maxCount = Math.floor(baseCount + rng() * 70);
      for (let i = 0; i < maxCount; i++) {
        const x = rng() * w;
        const rawY = rng();
        const biasedY = rawY + (rawY - 0.5) * latBias;
        const y = Math.max(0, Math.min(1, biasedY)) * h;
        const radius = (0.5 + rng() * 3.2) * sizeMul;
        const craterStrength = 0.7 + rng() * 0.6;
        const shadowAlpha = Math.min(0.4, shadowBase * craterStrength);
        const g1 = cctx.createRadialGradient(x, y, radius * 0.6, x, y, radius);
        g1.addColorStop(0, 'rgba(0,0,0,0)');
        g1.addColorStop(1, `rgba(0,0,0,${shadowAlpha})`);
        cctx.fillStyle = g1;
        cctx.beginPath();
        cctx.arc(x, y, radius, 0, Math.PI * 2);
        cctx.fill();

        const highlightRadius = radius * (0.55 + rng() * 0.2);
        const highlightAlpha = Math.min(0.2, highlightBase * (0.9 + rng() * 0.6));
        const g2 = cctx.createRadialGradient(x, y, 0, x, y, highlightRadius);
        g2.addColorStop(0, `rgba(255,255,255,${highlightAlpha})`);
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        cctx.fillStyle = g2;
        cctx.beginPath();
        cctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
        cctx.fill();
      }

      const img = cctx.getImageData(0, 0, w, h);
      const data = img.data;
      this.craterAlphaData = new Float32Array(w * h);
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
      this.craterLayer = craterCanvas;
      this.craterSeedKey = craterSeedKey;
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
    const smoothstep = (e0, e1, x) => {
      const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-6, (e1 - e0))));
      return t * t * (3 - 2 * t);
    };
    const palette = TYPE_SURFACE_PRESETS[typeValue] || TYPE_SURFACE_PRESETS.default;
    const offsets = encodeTypeOffsets(typeForNoise);
    const seededNoise = (sx, sy, salt) => {
      const x = sx + offsets.x * 0.001 + planetSeed.x * 97.13;
      const y = sy + offsets.y * 0.001 + planetSeed.y * 131.79;
      const v = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
      return v - Math.floor(v);
    };
    const highlightNoise = seededNoise(0.37, 0.91, 11.3);
    const shadowNoise = seededNoise(0.53, 1.23, 23.5);
    const tintNoise = seededNoise(2.11, 0.37, 5.71);
    const baseHex = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
    const topBlend = clamp01(palette.highlightMix + (highlightNoise - 0.5) * palette.highlightJitter);
    const bottomBlend = clamp01(palette.shadowMix + (shadowNoise - 0.5) * palette.shadowJitter);
    const topTarget = palette.highlight || '#ffffff';
    const bottomTarget = palette.shadow || '#000000';
    const topCol = mix(baseHex, topTarget, topBlend);
    const botCol = mix(baseHex, bottomTarget, bottomBlend);
    const tintStrengthBase = palette.tintStrength ?? 0;
    const tintStrength = tintStrengthBase > 0
      ? clamp01(tintStrengthBase + (tintNoise - 0.5) * (palette.tintJitter ?? 0))
      : 0;
    const tintColor = palette.tint ? hexToRgb(palette.tint) : null;
    const hasTint = tintStrength > 0 && !!tintColor;
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

    if (!this.heightMap) this.generateHeightMap(w, h);
    try {
      const timg = ctx.getImageData(0, 0, w, h);
      const tdata = timg.data;

      // Prepare large-scale feature noise (dark regions)
      const seed = planetSeed;
      const featureKeyBase = `${typeForNoise}|surface-large`;
      const typeShiftX = (uintToUnit(hashStringToUint(`${featureKeyBase}|shiftX`)) - 0.5) * 1.6;
      const typeShiftY = (uintToUnit(hashStringToUint(`${featureKeyBase}|shiftY`)) - 0.5) * 1.6;
      const typeScaleMul = 0.65 + uintToUnit(hashStringToUint(`${featureKeyBase}|scale`)) * 1.35;
      const typeAnisoMul = 0.75 + uintToUnit(hashStringToUint(`${featureKeyBase}|aniso`)) * 0.7;
      const typeLacunarity = 1.8 + uintToUnit(hashStringToUint(`${featureKeyBase}|lac`)) * 0.7;
      const typeGain = 0.45 + uintToUnit(hashStringToUint(`${featureKeyBase}|gain`)) * 0.3;
      const typeContrastMul = 0.75 + uintToUnit(hashStringToUint(`${featureKeyBase}|contrast`)) * 0.7;
      let maskLow = 0.08 + uintToUnit(hashStringToUint(`${featureKeyBase}|low`)) * 0.25;
      let maskHigh = 0.55 + uintToUnit(hashStringToUint(`${featureKeyBase}|high`)) * 0.35;
      if (maskHigh - maskLow < 0.12) {
        const mid = (maskLow + maskHigh) * 0.5;
        maskLow = mid - 0.06;
        maskHigh = mid + 0.06;
      }
      if (maskLow < 0) maskLow = 0;
      if (maskHigh > 1) maskHigh = 1;
      const maskRange = Math.max(0.0001, maskHigh - maskLow);
      let s = Math.floor((seed.x * 65535) ^ (seed.y * 524287) ^ hashStringToUint(`${featureKeyBase}|seed`)) >>> 0;
      const baseHashShiftX = planetSeed.x * 97.13 + typeShiftX * 17.19;
      const baseHashShiftY = planetSeed.y * 131.79 + typeShiftY * 19.73;
      const hashSalt = uintToUnit(hashStringToUint(`${featureKeyBase}|salt`)) * 13.7;
      const rotation = uintToUnit(hashStringToUint(`${featureKeyBase}|rot`)) * Math.PI * 2;
      const rotCos = Math.cos(rotation);
      const rotSin = Math.sin(rotation);
      const hash = (x, y) => {
        const px = x + baseHashShiftX;
        const py = y + baseHashShiftY;
        const n = Math.sin(px * 127.1 + py * 311.7 + s * 0.000071 + hashSalt) * 43758.5453;
        return n - Math.floor(n);
      };
      const smooth = (t) => t * t * (3 - 2 * t);
      const value2 = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi; const u = smooth(xf), v = smooth(yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y, oct = 4, lac = typeLacunarity, gain = typeGain) => {
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
        const heightMul = 0.85 + 0.3 * Math.pow(hgt, 1.2);

        // Large-scale dark regions multiplier
        let featureMul = 1.0;
        if (fEnabled && fStrength > 0) {
          const x = i % w;
          const y = (i - x) / w;
          const cx = x / w - 0.5;
          const cy = y / h - 0.5;
          const rx = cx * rotCos - cy * rotSin;
          const ry = cx * rotSin + cy * rotCos;
          const nx = (rx + 0.5 + fOffX + typeShiftX) * fScale * typeScaleMul;
          const ny = (ry + 0.5 + fOffY + typeShiftY) * (fScale * 0.5 * typeAnisoMul);
          let v = fbm(nx, ny);
          v = Math.max(0, Math.min(1, v));
          let level = (v - maskLow) / maskRange;
          if (level < 0) level = 0; else if (level > 1) level = 1;
          const shaped = Math.pow(level, Math.max(0.0001, fContrast * typeContrastMul));
          featureMul = 1 - fStrength * shaped;
          if (featureMul < 0) featureMul = 0;
        }

        const idx = i * 4;
        const mul = heightMul * featureMul;
        let r = Math.min(255, Math.floor(tdata[idx] * mul));
        let g = Math.min(255, Math.floor(tdata[idx + 1] * mul));
        let b = Math.min(255, Math.floor(tdata[idx + 2] * mul));
        if (hasTint) {
          r = Math.round(r + (tintColor.r - r) * tintStrength);
          g = Math.round(g + (tintColor.g - g) * tintStrength);
          b = Math.round(b + (tintColor.b - b) * tintStrength);
        }
        tdata[idx] = r;
        tdata[idx + 1] = g;
        tdata[idx + 2] = b;
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
      const latAbs = Math.min(1, Math.abs((y / (h - 1)) - 0.5) * 2);
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
      let alphaSum = 0;
      let weightSum = 0;
      const weights = [w0, w1, w2];
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

  PlanetVisualizer.prototype.getIceNoiseField = function getIceNoiseField(w, h) {
    const cached = this._iceNoise;
    if (cached?.w === w && cached?.h === h && cached.data) return cached.data;
    const seed = this.hashSeedFromPlanet();
    let s = Math.floor((seed.x * 131071) ^ (seed.y * 524287)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 157.3 + y * 289.1 + s * 0.00017) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
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
    const fbm = (x, y, oct = 4, lac = 2.15, gain = 0.45) => {
      let f = 0, amp = 0.5, freq = 1.0;
      for (let o = 0; o < oct; o++) {
        f += amp * value2(x * freq, y * freq);
        freq *= lac;
        amp *= gain;
      }
      return f;
    };
    const arr = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const lat = Math.abs((y / (h - 1)) - 0.5) * 0.6;
      for (let x = 0; x < w; x++) {
        const nx = (x / w) * (2.6 + lat * 0.8);
        const ny = (y / h) * (1.3 + lat * 1.6);
        let v = fbm(nx + lat * 0.5, ny, 4, 2.1, 0.45);
        if (v < 0) v = 0; else if (v > 1) v = 1;
        arr[y * w + x] = v;
      }
    }
    this._iceNoise = { w, h, data: arr };
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
