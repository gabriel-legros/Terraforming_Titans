(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.createCloudSphere = function createCloudSphere() {
    const isRing = this.isRingWorld();
    const ringRadius = this.ringRadius || 1;
    const ringHeight = this.ringHeight || 0.23625;
    const cloudRadius = isRing ? Math.max(0.2, ringRadius - 0.015) : 1.022;
    const cloudHeight = ringHeight;
    const geo = isRing
      ? new THREE.CylinderGeometry(cloudRadius, cloudRadius, cloudHeight, 96, 1, true)
      : new THREE.SphereGeometry(cloudRadius, 64, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: isRing ? THREE.BackSide : THREE.FrontSide,
    });
    this.cloudMaterial = mat;
    this.cloudMesh = new THREE.Mesh(geo, mat);
    this.cloudMesh.renderOrder = 5;
    this.scene.add(this.cloudMesh);
    this.updateCloudMeshTexture();
  };

  PlanetVisualizer.prototype.getCloudTextureSize = function getCloudTextureSize() {
    if (this.isRingWorld()) {
      const aspect = this.getRingUvAspect();
      const w = 2048;
      let h = Math.round(w / aspect);
      if (h < 256) h = 256;
      if (h > 1024) h = 1024;
      return { w, h };
    }
    return { w: 512, h: 256 };
  };

  PlanetVisualizer.prototype.updateCloudMeshTexture = function updateCloudMeshTexture() {
    const size = this.getCloudTextureSize();
    const w = size.w;
    const h = size.h;
    if (!this.cloudMap || !this.cloudHist || this.cloudMap.length !== w * h) {
      this.generateCloudMap(w, h);
    }
    const cloudPct = Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0));
    const cov = cloudPct / 100;
    const total = this.cloudHist.total || (w * h);
    const target = Math.round((cloudPct / 100) * total);
    let thr = 256;
    if (target > 0 && target < total) {
      let acc = 0;
      for (let k = 255; k >= 0; k--) {
        acc += this.cloudHist.counts[k];
        if (acc >= target) { thr = k; break; }
      }
    }
    const canv = document.createElement('canvas');
    canv.width = w;
    canv.height = h;
    const ctx = canv.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const thrValue = thr <= 255 ? thr / 255 : 2;
    const edge = 0.025;
    const overcastFloor = cov > 0.9 ? 0.35 * ((cov - 0.9) / 0.1) : 0;
    const isRing = this.isRingWorld();
    const smoothstep = (a, b, t) => {
      const v = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return v * v * (3 - 2 * v);
    };
    for (let i = 0; i < w * h; i++) {
      const v = Math.max(0, Math.min(1, this.cloudMap[i] || 0));
      let alphaBase = 0;
      if (target >= total) {
        alphaBase = 1;
      } else if (target > 0) {
        alphaBase = smoothstep(thrValue - edge, thrValue + edge, v);
      }
      const density = 0.25 + 0.75 * Math.pow(v, 1.1);
      let bandMask = 1;
      if (isRing) {
        const y = Math.floor(i / w);
        const vy = y / (h - 1);
        const dist = Math.abs(vy - 0.5);
        bandMask = 1 - smoothstep(0.47, 0.5, dist);
      }
      const alpha = Math.max(overcastFloor, alphaBase * density) * bandMask;
      const idx = i * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.max(0, Math.min(255, Math.round(205 * alpha)));
    }
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      const first = row;
      const last = row + (w - 1) * 4;
      data[last] = data[first];
      data[last + 1] = data[first + 1];
      data[last + 2] = data[first + 2];
      data[last + 3] = data[first + 3];
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canv);
    if (THREE && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.cloudMaterial.map = tex;
    if (this.cloudMaterial) {
      this.cloudMaterial.opacity = 0.45 + 0.55 * Math.pow(cov, 1.15);
    }
    this.cloudMaterial.needsUpdate = true;
    this._lastCloudCoverageKey = `${cloudPct.toFixed(2)}`;
  };

  PlanetVisualizer.prototype.generateCloudCanvas = function generateCloudCanvas() {
    const w = 1024;
    const h = 512;
    if (!this._cloudCanvas) {
      this._cloudCanvas = document.createElement('canvas');
      this._cloudCanvas.width = w;
      this._cloudCanvas.height = h;
    }
    const canvas = this._cloudCanvas;
    const ctx = canvas.getContext('2d');

    if (!this._cloudBlobState) {
      const seed = this.hashSeedFromPlanet();
      let s = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
      const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
      const blobs = 900;
      const items = [];
      for (let i = 0; i < blobs; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 8 + rand() * 40;
        const a = 0.15 + rand() * 0.15;
        const dx = (rand() - 0.5) * 5.4;
        const dy = (rand() - 0.5) * 2.7;
        const dr = (rand() - 0.5) * 3;
        items.push({ x, y, r, a, dx, dy, dr });
      }
      this._cloudBlobState = { items, lastDays: 0 };
    }

    let signedDays = 0;
    if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.dayDuration === 'number') {
      const duration = dayNightCycle.dayDuration;
      const magnitude = Math.max(1, Math.abs(duration));
      const time = Number.isFinite(dayNightCycle.rotationTime)
        ? dayNightCycle.rotationTime
        : (dayNightCycle.elapsedTime || 0) * (dayNightCycle.rotationDirection < 0 ? -1 : 1);
      signedDays = time / magnitude;
    } else {
      signedDays = (performance.now() / 1000) / 60;
    }
    const state = this._cloudBlobState;
    const deltaDays = Math.max(-0.2, Math.min(0.2, signedDays - (state.lastDays || 0)));
    state.lastDays = signedDays;

    const items = state.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.x = (it.x + it.dx * deltaDays + w) % w;
      it.y = (it.y + it.dy * deltaDays + h) % h;
      it.r = Math.max(6, Math.min(50, it.r + it.dr * deltaDays));
    }

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
  };

  PlanetVisualizer.prototype.updateCloudTexture = function updateCloudTexture(force = false) {
    if (!this.cloudMesh || !this.cloudMaterial) return;
    const cov = Math.max(0, Math.min(1, (this.viz.coverage?.cloud || 0) / 100));
    if (!this.cloudMaterial.map || force) {
      const canvas = this.generateCloudCanvas();
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      this.cloudMaterial.map = tex;
      this.cloudMaterial.needsUpdate = true;
    }
    this.cloudMaterial.opacity = Math.min(1, 0.35 + 0.9 * cov);
  };

  PlanetVisualizer.prototype.updateCloudUniforms = function updateCloudUniforms() {
    if (this.cloudMesh) this.cloudMesh.visible = true;
    if (this.cloudMesh && this.cloudMaterial) {
      const keyNow = `${Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0)).toFixed(2)}`;
      if (this._lastCloudCoverageKey !== keyNow) {
        this.updateCloudMeshTexture();
      }
    }
  };

  PlanetVisualizer.prototype.generateCloudMap = function generateCloudMap(w, h) {
    if (this.isRingWorld()) {
      const ringAspect = this.getRingUvAspect();
      const seed = this.hashSeedFromPlanet();
      let s = Math.floor((seed.x * 131071) ^ (seed.y * 524287)) >>> 0;
      const hash = (x, y) => {
        const n = Math.sin(x * 157.31 + y * 113.97 + s * 0.000137) * 43758.5453;
        return n - Math.floor(n);
      };
      const smooth = (t) => t * t * (3 - 2 * t);
      const wrapIndex = (idx, period) => {
        const p = Math.max(1, Math.round(period));
        let v = idx % p;
        if (v < 0) v += p;
        return v;
      };
      const value2Periodic = (x, y, period) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = smooth(xf), v = smooth(yf);
        const x0 = wrapIndex(xi, period);
        const x1 = wrapIndex(xi + 1, period);
        const a = hash(x0, yi), b = hash(x1, yi);
        const c = hash(x0, yi + 1), d = hash(x1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      };
      const fbm = (x, y, oct = 5, lac = 2.0, gain = 0.5, periodBase = 0) => {
        let f = 0, amp = 0.5, freq = 1;
        for (let o = 0; o < oct; o++) {
          const px = x * freq;
          const py = y * freq;
          const period = periodBase ? periodBase * freq : 0;
          f += amp * value2Periodic(px, py, period);
          freq *= lac; amp *= gain;
        }
        return f;
      };
      const arr = new Float32Array(w * h);
      let minV = Infinity, maxV = -Infinity;
      const scale = 4.4;
      const nyScale = scale * 1.2;
      const periodBase = scale * ringAspect;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x / w) * scale * ringAspect;
          const ny = (y / h) * nyScale;
          const base = fbm(nx, ny, 3, 2.0, 0.5, periodBase);
          const detail = fbm(nx * 3.6, ny * 3.6, 4, 2.2, 0.55, periodBase * 3.6);
          const crack1 = fbm(nx * 5.8, ny * 5.8, 3, 2.2, 0.55, periodBase * 5.8);
          const crack2 = fbm(nx * 10.2, ny * 10.2, 2, 2.0, 0.6, periodBase * 10.2);
          const carve = 0.55 * (1 - Math.abs(2 * crack1 - 1)) + 0.45 * (1 - Math.abs(2 * crack2 - 1));
          let v = 0.5 * base + 0.5 * detail;
          v = v - 0.22 * carve;
          v = Math.max(0, Math.min(1, v));
          minV = Math.min(minV, v); maxV = Math.max(maxV, v);
          arr[y * w + x] = v;
        }
      }
      const span = Math.max(1e-6, maxV - minV);
      for (let i = 0; i < w * h; i++) arr[i] = (arr[i] - minV) / span;
      this.cloudMap = arr;
      const hist = { counts: new Uint32Array(256), total: w * h };
      for (let i = 0; i < w * h; i++) {
        const bin = Math.max(0, Math.min(255, Math.floor(arr[i] * 255)));
        hist.counts[bin]++;
      }
      this.cloudHist = hist;
      return;
    }
    const seed = this.hashSeedFromPlanet();
    let s = Math.floor((seed.x * 131071) ^ (seed.y * 524287)) >>> 0;
    const hash = (x, y) => {
      const n = Math.sin(x * 157.31 + y * 113.97 + s * 0.000137) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const hash3 = (x, y, z) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 0.000137) * 43758.5453;
      return n - Math.floor(n);
    };
    const value3 = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const u = smooth(xf), v = smooth(yf), wv = smooth(zf);
      const a = hash3(xi, yi, zi);
      const b = hash3(xi + 1, yi, zi);
      const c = hash3(xi, yi + 1, zi);
      const d = hash3(xi + 1, yi + 1, zi);
      const e = hash3(xi, yi, zi + 1);
      const f = hash3(xi + 1, yi, zi + 1);
      const g = hash3(xi, yi + 1, zi + 1);
      const h = hash3(xi + 1, yi + 1, zi + 1);
      const x1 = a * (1 - u) + b * u;
      const x2 = c * (1 - u) + d * u;
      const y1 = x1 * (1 - v) + x2 * v;
      const x3 = e * (1 - u) + f * u;
      const x4 = g * (1 - u) + h * u;
      const y2 = x3 * (1 - v) + x4 * v;
      return y1 * (1 - wv) + y2 * wv;
    };
    const fbm3 = (x, y, z, oct, lac = 2.0, gain = 0.5) => {
      let f = 0, amp = 0.5, freq = 1;
      for (let o = 0; o < oct; o++) {
        f += amp * value3(x * freq, y * freq, z * freq);
        freq *= lac; amp *= gain;
      }
      return f;
    };
    const billow3 = (x, y, z, oct, lac = 2.0, gain = 0.5) => {
      let f = 0, amp = 0.6, freq = 1;
      for (let o = 0; o < oct; o++) {
        const n = value3(x * freq, y * freq, z * freq);
        const b = 1.0 - Math.abs(2.0 * n - 1.0);
        f += amp * (b * b);
        freq *= lac; amp *= gain;
      }
      return f;
    };
    const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return (s & 0xffffffff) / 0x100000000; };
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const clampUnit = (v) => Math.max(-1, Math.min(1, v));
    const smoothstep = (a, b, t) => {
      const v = clamp01((t - a) / (b - a));
      return v * v * (3 - 2 * v);
    };
    const storms = [];
    for (let i = 0; i < 4; i++) {
      const stormLat = (rand() * 1.1 - 0.55) * (Math.PI / 2);
      const stormLon = rand() * Math.PI * 2;
      const stormCosLat = Math.cos(stormLat);
      storms.push({
        x: Math.cos(stormLon) * stormCosLat,
        y: Math.sin(stormLat),
        z: Math.sin(stormLon) * stormCosLat,
        ex: -Math.sin(stormLon),
        ey: 0,
        ez: Math.cos(stormLon),
        nx: -Math.cos(stormLon) * Math.sin(stormLat),
        ny: stormCosLat,
        nz: -Math.sin(stormLon) * Math.sin(stormLat),
        spin: rand() < 0.5 ? -1 : 1,
        cosOuter: Math.cos(0.72 + rand() * 0.16),
        cosInner: Math.cos(0.24 + rand() * 0.12),
        swirl: 0.12 + rand() * 0.05,
        pull: 0.02 + rand() * 0.02,
        twist: 7 + rand() * 4,
        arms: 2 + Math.floor(rand() * 2),
        phase: rand() * Math.PI * 2,
        bandBoost: 0.05 + rand() * 0.03,
      });
    }
    const arr = new Float32Array(w * h);
    let minV = Infinity, maxV = -Infinity;
    for (let y = 0; y < h; y++) {
      const vy = y / h;
      const lat = (vy - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const vx = x / w;
        const lon = vx * Math.PI * 2;
        const px = Math.cos(lon) * cosLat;
        const py = sinLat;
        const pz = Math.sin(lon) * cosLat;
        const eastX = -Math.sin(lon);
        const eastY = 0;
        const eastZ = Math.cos(lon);
        const northX = -Math.cos(lon) * sinLat;
        const northY = cosLat;
        const northZ = -Math.sin(lon) * sinLat;
        const jetBand = clamp01(1 - Math.abs(Math.abs(sinLat) - 0.55) / 0.55);
        const jetNoise = fbm3(px * 1.3 + 9.7, py * 1.3 - 3.6, pz * 1.3 + 4.8, 3, 2.0, 0.5) - 0.5;
        let flowEast = 0.2 * Math.sin(lat * 6.5 + jetNoise * 7.5) * jetBand;
        flowEast += 0.16 * (fbm3(px * 1.6 - 6.4, py * 1.6 + 2.8, pz * 1.6 + 7.1, 3, 2.1, 0.55) - 0.5);
        const flowNorth = 0.12 * (fbm3(px * 1.7 + 1.6, py * 1.7 - 7.4, pz * 1.7 + 3.2, 3, 2.0, 0.5) - 0.5);
        let flowX = eastX * flowEast + northX * flowNorth;
        let flowY = eastY * flowEast + northY * flowNorth;
        let flowZ = eastZ * flowEast + northZ * flowNorth;
        let stormBands = 0;
        for (let i = 0; i < storms.length; i++) {
          const storm = storms[i];
          const dot = px * storm.x + py * storm.y + pz * storm.z;
          if (dot <= storm.cosOuter) continue;
          const influence = smoothstep(storm.cosOuter, storm.cosInner, dot);
          const tangentX = storm.y * pz - storm.z * py;
          const tangentY = storm.z * px - storm.x * pz;
          const tangentZ = storm.x * py - storm.y * px;
          const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ) || 1;
          const radialX = storm.x - dot * px;
          const radialY = storm.y - dot * py;
          const radialZ = storm.z - dot * pz;
          const radialLen = Math.sqrt(radialX * radialX + radialY * radialY + radialZ * radialZ) || 1;
          flowX += influence * (storm.spin * (tangentX / tangentLen) * storm.swirl + (radialX / radialLen) * storm.pull);
          flowY += influence * (storm.spin * (tangentY / tangentLen) * storm.swirl + (radialY / radialLen) * storm.pull);
          flowZ += influence * (storm.spin * (tangentZ / tangentLen) * storm.swirl + (radialZ / radialLen) * storm.pull);
          const localU = px * storm.ex + py * storm.ey + pz * storm.ez;
          const localV = px * storm.nx + py * storm.ny + pz * storm.nz;
          const angle = Math.atan2(localV, localU);
          const radius = Math.acos(clampUnit(dot));
          const spiral = 0.5 + 0.5 * Math.cos(storm.spin * angle * storm.arms - radius * storm.twist + storm.phase);
          stormBands += influence * spiral * storm.bandBoost;
        }
        const flowLen = Math.sqrt((px + flowX) * (px + flowX) + (py + flowY) * (py + flowY) + (pz + flowZ) * (pz + flowZ)) || 1;
        const sx = (px + flowX) / flowLen;
        const sy = (py + flowY) / flowLen;
        const sz = (pz + flowZ) / flowLen;
        const warp = fbm3(sx * 1.45 + 7.3, sy * 1.45 - 3.1, sz * 1.45 + 5.9, 3, 2.05, 0.55);
        const ux = sx * 2.05 + flowX * 0.7 + (warp - 0.5) * 0.95;
        const uy = sy * 2.05 + flowY * 0.7 + (warp - 0.5) * 0.8;
        const uz = sz * 2.05 + flowZ * 0.7 + (warp - 0.5) * 0.95;
        const cumulus = fbm3(ux, uy, uz, 6, 1.9, 0.5);
        const cirrus = Math.pow(fbm3(ux * 2.15, uy * 1.05, uz * 2.15, 4, 2.0, 0.6), 1.35);
        const cracks1 = billow3(ux * 2.8, uy * 2.8, uz * 2.8, 4, 1.95, 0.55);
        const cracks2 = billow3(ux * 5.2, uy * 5.2, uz * 5.2, 2, 2.0, 0.6);
        const polarCap = smoothstep(0.6, 0.96, Math.abs(sinLat));
        const polarBreakup = billow3(ux * 7.4 + 4.3, uy * 4.6 - 6.1, uz * 7.4 + 1.7, 3, 2.05, 0.58);
        let v = 0.67 * cumulus + 0.33 * cirrus + stormBands * (1 - 0.4 * polarCap);
        v = v - 0.24 * cracks1 - 0.1 * cracks2;
        v = v - 0.09 * Math.pow(polarBreakup, 1.15) * polarCap;
        v *= 0.84 + 0.16 * (1 - Math.abs(sinLat));
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        arr[y * w + x] = v;
      }
    }
    const span = Math.max(1e-6, maxV - minV);
    for (let i = 0; i < w * h; i++) arr[i] = (arr[i] - minV) / span;
    this.cloudMap = arr;
    const hist = { counts: new Uint32Array(256), total: w * h };
    for (let i = 0; i < w * h; i++) {
      const bin = Math.max(0, Math.min(255, Math.floor(arr[i] * 255)));
      hist.counts[bin]++;
    }
    this.cloudHist = hist;
  };
})();
