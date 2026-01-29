(function () {
  const PlanetVisualizer = window.PlanetVisualizer;

  function buildPanelTexture(width, height, seed) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const base = '#646e78';
    const dark = '#3f464d';
    const edge = '#1f2327';
    const glow = '#7f8890';

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#707a83');
    grad.addColorStop(0.5, base);
    grad.addColorStop(1, '#575f67');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const rand = (() => {
      let s = Math.floor(seed * 0xffffffff) >>> 0;
      return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s & 0xffffffff) / 0x100000000;
      };
    })();

    const panelW = 28;
    const panelH = 12;
    ctx.lineWidth = 2;
    ctx.strokeStyle = edge;
    for (let x = 0; x <= width; x += panelW) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += panelH) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = dark;
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(rand() * width);
      const y = Math.floor(rand() * height);
      const w = 6 + Math.floor(rand() * 10);
      const h = 2 + Math.floor(rand() * 3);
      ctx.fillRect(x, y, w, h);
    }

    ctx.fillStyle = glow;
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(rand() * width);
      const y = Math.floor(rand() * height);
      ctx.fillRect(x, y, 2, 2);
    }

    return canvas;
  }

  PlanetVisualizer.prototype.createRingShadePanels = function createRingShadePanels() {
    const ringRadius = this.ringRadius || 1;
    const ringHeight = this.ringHeight || 0.23625;
    const shadeRadius = Math.max(0.1, ringRadius - 0.04);
    const shadeHeight = ringHeight * 1.02;
    const panelCount = 12;
    const panelDeg = 15;
    const panelRad = (panelDeg * Math.PI) / 180;
    const stepRad = panelRad * 2;

    const circumference = Math.PI * 2 * ringRadius;
    const aspect = circumference / Math.max(0.05, ringHeight);
    const texWidth = 512;
    const texHeight = 128;
    const seedPoint = this.hashSeedFromPlanet();
    const seed = (seedPoint.x + seedPoint.y) * 0.5;
    const texCanvas = buildPanelTexture(texWidth, texHeight, seed);
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(8, Math.round(aspect / 1.2)), 3);
    texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;

    const material = new THREE.MeshStandardMaterial({
      color: 0x6c7780,
      metalness: 0.92,
      roughness: 0.36,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.83,
      emissive: new THREE.Color(0x0c0f12),
      emissiveIntensity: 0.04,
    });
    material.map = texture;
    material.depthWrite = false;
    material.depthTest = false;

    const group = new THREE.Group();
    for (let i = 0; i < panelCount; i++) {
      const geometry = new THREE.CylinderGeometry(
        shadeRadius,
        shadeRadius,
        shadeHeight,
        96,
        1,
        true,
        i * stepRad,
        panelRad
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 12;
      group.add(mesh);
    }

    this.ringShadeMesh = group;
    this.ringShadeMaterial = material;
    this.ringShadeOffset = 0;

    this.scene.add(group);
  };

  PlanetVisualizer.prototype.updateRingShadePanels = function updateRingShadePanels(baseAngle) {
    const now = performance.now();
    const last = this._lastShadeTime || now;
    const dt = Math.min(0.05, (now - last) / 1000);
    this._lastShadeTime = now;
    this.ringShadeOffset = (this.ringShadeOffset || 0) + (this.ringShadeDriftSpeed || 0.006) * dt;
    this.ringShadeMesh.rotation.y = baseAngle + this.ringShadeOffset;
  };
})();
