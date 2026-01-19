(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.createCloudSphere = function createCloudSphere() {
    const cloudRadius = 1.022;
    const geo = new THREE.SphereGeometry(cloudRadius, 64, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });
    this.cloudMaterial = mat;
    this.cloudMesh = new THREE.Mesh(geo, mat);
    this.cloudMesh.renderOrder = 5;
    this.scene.add(this.cloudMesh);
    this.updateCloudMeshTexture();
  };

  PlanetVisualizer.prototype.updateCloudMeshTexture = function updateCloudMeshTexture() {
    const w = 512;
    const h = 256;
    if (!this.cloudMap || !this.cloudHist || this.cloudMap.length !== w * h) {
      this.generateCloudMap(w, h);
    }
    const cloudPct = Math.max(0, Math.min(100, this.viz.coverage?.cloud || 0));
    const total = this.cloudHist.total || (w * h);
    const target = Math.round((cloudPct / 100) * total);
    let thr = -1;
    if (target > 0) {
      let acc = 0;
      for (let k = 0; k <= 255; k++) {
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
    const thrValue = thr >= 0 ? thr / 255 : -1;
    const edge = 0.065;
    const smoothstep = (a, b, t) => {
      const v = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return v * v * (3 - 2 * v);
    };
    for (let i = 0; i < w * h; i++) {
      const v = Math.max(0, Math.min(1, this.cloudMap[i] || 0));
      const alphaBase = thrValue >= 0
        ? 1 - smoothstep(thrValue - edge, thrValue + edge, v)
        : 0;
      const density = 0.55 + 0.6 * (1 - v);
      const idx = i * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.max(0, Math.min(255, Math.round(245 * alphaBase * density)));
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
        const nx = Math.cos(lon) * cosLat;
        const ny = sinLat;
        const nz = Math.sin(lon) * cosLat;
        const warp = fbm3(nx * 1.7 + 7.3, ny * 1.7 - 3.1, nz * 1.7 + 5.9, 3, 2.1, 0.55);
        const ux = nx * 2.4 + (warp - 0.5) * 1.1;
        const uy = ny * 2.4 + (warp - 0.5) * 0.9;
        const uz = nz * 2.4 + (warp - 0.5) * 1.0;
        const cumulus = fbm3(ux, uy, uz, 6, 2.0, 0.5);
        const cirrus = Math.pow(fbm3(ux * 2.4, uy * 1.1, uz * 2.4, 4, 2.1, 0.6), 1.4);
        const cracks1 = billow3(ux * 3.2, uy * 3.2, uz * 3.2, 4, 2.0, 0.55);
        const cracks2 = billow3(ux * 6.4, uy * 6.4, uz * 6.4, 3, 2.0, 0.6);
        let v = 0.65 * cumulus + 0.35 * cirrus;
        v = v - 0.32 * cracks1 - 0.16 * cracks2;
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
