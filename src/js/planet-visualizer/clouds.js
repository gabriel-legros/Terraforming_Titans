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
    for (let i = 0; i < w * h; i++) {
      const v = Math.max(0, Math.min(1, this.cloudMap[i] || 0));
      const bin = Math.max(0, Math.min(255, Math.floor(v * 255)));
      const on = (thr >= 0) ? (bin <= thr) : false;
      const idx = i * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = on ? 225 : 0;
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

    let days = 0;
    if (typeof dayNightCycle !== 'undefined' && dayNightCycle && typeof dayNightCycle.dayDuration === 'number') {
      days = (dayNightCycle.elapsedTime || 0) / Math.max(1, dayNightCycle.dayDuration);
    } else {
      days = (performance.now() / 1000) / 60;
    }
    const state = this._cloudBlobState;
    const deltaDays = Math.max(0, Math.min(0.2, days - (state.lastDays || 0)));
    state.lastDays = days;

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
    this.cloudMaterial.opacity = 0.2 + 0.8 * cov;
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
    const fbm = (x, y, oct = 8, lac = 2.2, gain = 0.5) => {
      let f = 0, amp = 0.5, freq = 0.9;
      for (let o = 0; o < oct; o++) { f += amp * value2(x * freq, y * freq); freq *= lac; amp *= gain; }
      return f;
    };
    const billow = (x, y, oct = 5, lac = 2.6, gain = 0.52) => {
      let f = 0, amp = 0.6, freq = 1.2;
      for (let o = 0; o < oct; o++) {
        const n = value2(x * freq, y * freq);
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
      for (let x = 0; x < w; x++) {
        const vx = x / w;
        const wx = fbm(vx * 0.9 + 7.13, vy * 0.7 + 3.71);
        const wy = fbm(vx * 0.7 - 2.19, vy * 0.9 - 5.28);
        const ux = vx * 2.6 + (wx - 0.5) * 0.9;
        const uy = vy * 2.0 + (wy - 0.5) * 0.7;
        const cumulus = fbm(ux, uy, 7, 2.15, 0.5);
        const cirrus = Math.pow(fbm(ux * 3.4, uy * 0.7, 5, 2.7, 0.58), 1.5);
        const cracks1 = billow(ux * 6.0, uy * 6.2, 4, 2.8, 0.55);
        const cracks2 = billow(ux * 12.0, uy * 11.5, 3, 2.9, 0.6);
        let v = 0.65 * cumulus + 0.35 * cirrus;
        v = v - 0.35 * cracks1 - 0.18 * cracks2;
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
