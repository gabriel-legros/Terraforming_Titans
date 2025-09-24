(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.updateSurfaceTextureFromPressure = function updateSurfaceTextureFromPressure(force = false) {
    const kPa = this.computeTotalPressureKPa();
    const factor = Math.max(0, Math.min(1, 1 - (kPa / 100)));
    const water = (this.viz.coverage?.water || 0) / 100;
    const life = (this.viz.coverage?.life || 0) / 100;
    const cloud = (this.viz.coverage?.cloud || 0) / 100;
    const z = this.viz.zonalCoverage || {};
    // Increase precision for ice so tiny changes trigger re-render
    const zKey = ['tropical', 'temperate', 'polar']
      .map(k => {
        const zk = z[k] || {};
        return `${Number(zk.water ?? 0).toFixed(2)}_${Number(zk.ice ?? 0).toFixed(4)}_${Number(zk.life ?? 0).toFixed(2)}`;
      })
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

    if (!this.heightMap) this.generateHeightMap(w, h);
    try {
      const timg = ctx.getImageData(0, 0, w, h);
      const tdata = timg.data;

      // Prepare large-scale feature noise (dark regions)
      const seed = this.hashSeedFromPlanet();
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

      const smoothstep = (e0, e1, x) => {
        const t = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-6, (e1 - e0))));
        return t * t * (3 - 2 * t);
      };

      for (let i = 0; i < w * h; i++) {
        const hgt = this.heightMap ? this.heightMap[i] : 0.5;
        const heightMul = 0.85 + 0.3 * Math.pow(hgt, 1.2);

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
          featureMul = 1 - fStrength * shaped;
          if (featureMul < 0) featureMul = 0;
        }

        const idx = i * 4;
        const mul = heightMul * featureMul;
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
    const zIce = [
      Math.max(0, Math.min(1, Number(zc.tropical?.ice || 0))),
      Math.max(0, Math.min(1, Number(zc.temperate?.ice || 0))),
      Math.max(0, Math.min(1, Number(zc.polar?.ice || 0))),
    ];
    // Clamp near-zero ice to zero to avoid speckling when game drives tiny values
    const iceEps = 1e-4;
    if (zIce[0] < iceEps) zIce[0] = 0;
    if (zIce[1] < iceEps) zIce[1] = 0;
    if (zIce[2] < iceEps) zIce[2] = 0;
    const preferPoles = zIce[2] > zIce[0];
    // Zone boundary normalization for ice growth direction
    // latNorm = 0 at equator, 1 at poles; normalize within each zone so
    // temperate growth can originate from the colder (polar-side) boundary when appropriate.
    const zoneMinNorm = [0, 23.5 / 90, 66.5 / 90];
    const zoneMaxNorm = [23.5 / 90, 66.5 / 90, 1];
    if (!this._latNormalized || this._latNormalized.length !== h) {
      this._latNormalized = new Float32Array(h);
      for (let y = 0; y < h; y++) {
        const v = y / (h - 1);
        const latRad = (0.5 - v) * Math.PI;
        const norm = Math.abs(latRad) / (Math.PI / 2);
        this._latNormalized[y] = Math.max(0, Math.min(1, norm));
      }
    }
    if (!this.iceOrganicMask || this.iceOrganicMask.length !== w * h) {
      this.iceOrganicMask = this.generateWaterMask(w, h);
    }
    if (!this._iceScoreCache || this._iceScoreCache.length !== w * h) {
      this._iceScoreCache = new Float32Array(w * h);
    }
    if (!this._iceHist || this._iceHist.length !== 3) {
      this._iceHist = [
        { counts: new Uint32Array(256), total: 0 },
        { counts: new Uint32Array(256), total: 0 },
        { counts: new Uint32Array(256), total: 0 },
      ];
    } else {
      for (let zi = 0; zi < 3; zi++) {
        this._iceHist[zi].counts.fill(0);
        this._iceHist[zi].total = 0;
      }
    }
    const iceScores = this._iceScoreCache;
    const latRows = this._latNormalized;
    const iceNoise = this.iceOrganicMask;
    const iceHist = this._iceHist;
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
      const latNorm = latRows[y];
      const zMin = zoneMinNorm[zi];
      const zMax = zoneMaxNorm[zi];
      // Normalize latitude within the current zone [0..1]
      const zSpan = Math.max(1e-6, (zMax - zMin));
      let zLocal = (latNorm - zMin) / zSpan; if (zLocal < 0) zLocal = 0; else if (zLocal > 1) zLocal = 1;
      // Distance factor: prefer poles => grow from colder boundary (higher latitude)
      const latDistance = preferPoles ? (1 - zLocal) : zLocal;
      const organic = iceNoise ? iceNoise[i] : 0.5;
      const noise = (organic - 0.5) * 0.35 * (1 - Math.min(1, latDistance * 1.2));
      const heightVal = this.heightMap ? this.heightMap[i] : 0.5;
      const relief = (0.5 - heightVal) * 0.15 * (1 - latDistance);
      let score = latDistance + noise + relief;
      if (score < 0) score = 0; else if (score > 1) score = 1;
      iceScores[i] = score;
      const hist = iceHist[zi];
      const bin = Math.max(0, Math.min(255, Math.floor(score * 255)));
      hist.counts[bin]++;
      hist.total++;
    }
    const thrIdxIce = [-1, -1, -1];
    const thrValIce = [0, 0, 0];
    for (let zi = 0; zi < 3; zi++) {
      const hist = iceHist[zi];
      const total = hist.total;
      const target = Math.max(0, Math.min(1, zIce[zi])) * total;
      if (target > 0 && total > 0) {
        let acc = 0; let k = 0;
        for (; k <= 255; k++) {
          acc += hist.counts[k];
          if (acc >= target) {
            const count = hist.counts[k];
            const excess = acc - target;
            const partial = count > 0 ? 1 - Math.min(1, excess / count) : 1;
            thrIdxIce[zi] = k;
            thrValIce[zi] = (k + Math.max(0, Math.min(1, partial))) / 255;
            break;
          }
        }
        if (thrIdxIce[zi] < 0) {
          thrIdxIce[zi] = 255;
          thrValIce[zi] = 1;
        }
      }
    }
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      idata[idx] = 200;
      idata[idx + 1] = 220;
      idata[idx + 2] = 255;
      let alpha = 0;
      const y = Math.floor(i / w);
      const zi = this._zoneRowIndex ? this._zoneRowIndex[y] : 0;
      const thr = thrIdxIce[zi];
      if (thr >= 0) {
        const score = iceScores[i];
        const latNorm = latRows[y];
        const zMin = zoneMinNorm[zi];
        const zMax = zoneMaxNorm[zi];
        const zSpan = Math.max(1e-6, (zMax - zMin));
        let zLocal = (latNorm - zMin) / zSpan; if (zLocal < 0) zLocal = 0; else if (zLocal > 1) zLocal = 1;
        const latDistance = preferPoles ? (1 - zLocal) : zLocal;
        const softness = 0.05 + 0.15 * latDistance;
        const threshold = thrValIce[zi];
        if (score <= threshold) {
          alpha = 1;
        } else if (score < threshold + softness) {
          alpha = 1 - ((score - threshold) / Math.max(softness, 1e-6));
        }
        if (alpha > 0 && alpha < 1) {
          const blend = preferPoles ? 1.35 : 1.2;
          alpha = Math.pow(alpha, blend);
        }
      }
      if (alpha < 0) alpha = 0; else if (alpha > 1) alpha = 1;
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
