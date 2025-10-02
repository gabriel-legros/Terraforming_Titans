(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.createShipSystem = function createShipSystem() {
    const cap = this.shipCapacity;
    this.shipHeadPositions = new Float32Array(cap * 3);
    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.BufferAttribute(this.shipHeadPositions, 3));
    const headMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false });
    this.shipHeads = new THREE.Points(headGeo, headMat);
    this.scene.add(this.shipHeads);

    this.shipTrailPositions = new Float32Array(cap * 2 * 3);
    this.shipTrailColors = new Float32Array(cap * 2 * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.shipTrailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.shipTrailColors, 3));
    const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    this.shipTrails = new THREE.LineSegments(trailGeo, trailMat);
    this.scene.add(this.shipTrails);
  };

  PlanetVisualizer.prototype.spawnShip = function spawnShip() {
    const lon = Math.random() * Math.PI * 2;
    const inc = (Math.random() < 0.35 ? (Math.random() * 2 - 1) * (Math.PI / 12) : 0);
    const node = Math.random() * Math.PI * 2;
    const axis = new THREE.Vector3(Math.cos(node), 0, Math.sin(node));
    const r0 = 1.005;
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
      trail: 0.10,
    });
  };

  PlanetVisualizer.prototype.updateShips = function updateShips() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._lastAnimTime) / 1000);
    this._lastAnimTime = now;
    const target = Math.max(0, Math.min(this.shipCapacity, Math.floor(this.viz?.ships || 0)));
    if (this.shipStates.length < target) {
      const missing = target - this.shipStates.length;
      const rate = Math.min(20, this._spawnRate + missing * 0.2);
      this._spawnAcc += rate * dt;
      while (this._spawnAcc >= 1 && this.shipStates.length < target) {
        this.spawnShip();
        this._spawnAcc -= 1;
      }
    } else {
      if (this.shipStates.length > target) {
        this.shipStates.length = target;
      }
      this._spawnAcc = 0;
    }

    const headPos = this.shipHeadPositions;
    const trailPos = this.shipTrailPositions;
    const trailCol = this.shipTrailColors;
    const K_LAUNCH = 0.22;
    const OMEGA_L = -3.2;
    const OMEGA_O = -1.8;
    const sunDir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const q = new THREE.Quaternion();
    const basePos = new THREE.Vector3();
    const baseTan = new THREE.Vector3();

    for (let i = 0; i < this.shipStates.length; i++) {
      const s = this.shipStates[i];
      s.t += dt;
      if (s.phase === 0) {
        s.radius = s.radius * Math.exp(K_LAUNCH * dt);
        s.angle += OMEGA_L * dt;
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
        q.setFromAxisAngle(s.axis, s.inc);
        baseTan.set(Math.sin(s.angle), 0, -Math.cos(s.angle)).normalize();
        const tangent = baseTan.clone().applyQuaternion(q);
        const outward = s.pos.clone().normalize();
        const alpha = Math.min(1, s.t / 2.0);
        const dir = tangent.multiplyScalar(1.0 - 0.2 * alpha)
          .add(outward.multiplyScalar(0.2 + 0.8 * alpha))
          .normalize();
        const speed = Math.max(0, s.departSpeed || Math.abs(s.orbitRadius * OMEGA_O));
        s.pos.addScaledVector(dir, speed * dt);
        s.trail = (0.10 + 0.22 * Math.min(1, s.t / 3)) / 3;
        s.colorHead.setRGB(0.9, 0.95, 1.0);
        s.colorTail.setRGB(0.6, 0.8, 1.0);
        if (s.pos.length() > 20) { this.shipStates[i] = null; continue; }
      }

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
  };
})();
