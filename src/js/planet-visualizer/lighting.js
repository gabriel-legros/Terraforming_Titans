(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.createAtmosphere = function createAtmosphere() {
    const atmoRadius = 1.03;
    const geo = new THREE.SphereGeometry(atmoRadius, 48, 32);
    const uniforms = {
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
      cameraPos: { value: new THREE.Vector3() },
      rayleigh: { value: 1.0 },
      mie: { value: 0.02 },
      mieG: { value: 0.76 },
      pRatio: { value: 0.0 },
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
        vec3 N = normalize(vWorldPos);
        vec3 V = normalize(cameraPos - vWorldPos);
        float mu = clamp(dot(N, normalize(sunDir)), -1.0, 1.0);
        float cosTheta = clamp(dot(V, normalize(sunDir)), -1.0, 1.0);

        float viewN = clamp(1.0 - dot(N, V), 0.0, 1.0);

        float Fr = rayleighPhase(mu);
        float Fm = hgPhase(mu, mieG);

        float day = max(0.0, mu);
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
  };

  PlanetVisualizer.prototype.updateAtmosphereUniforms = function updateAtmosphereUniforms() {
    if (!this.atmoMaterial) return;
    const kPa = this.computeTotalPressureKPa();
    const pr = Math.max(0, Math.min(1, kPa / 100));
    const u = this.atmoMaterial.uniforms;
    u.pRatio.value = pr;
    u.rayleigh.value = 1.0 * (0.2 + 0.8 * pr);
    u.mie.value = 0.02 * (0.1 + 0.9 * pr);
    const dir = this.sunLight ? this.sunLight.position.clone().normalize() : new THREE.Vector3(1, 0, 0);
    u.sunDir.value.copy(dir);
    u.cameraPos.value.copy(this.camera.position);
    const water = (this.viz.coverage?.water || 0) / 100;
    const base = new THREE.Color(0x7aa6ff);
    const dry = new THREE.Color(0xd7a37a);
    const mix = dry.clone().lerp(base, water);
    u.tint.value.copy(mix);
  };

  PlanetVisualizer.prototype.updateSunFromInclination = function updateSunFromInclination() {
    if (!this.sunLight) return;
    const deg = (this.viz?.inclinationDeg ?? 15);
    const elev = deg * Math.PI / 180;
    const az = Math.atan2(2, 5);
    const r = 6.0;
    const x = r * Math.cos(elev) * Math.cos(az);
    const y = r * Math.sin(elev);
    const z = r * Math.cos(elev) * Math.sin(az);
    this.sunLight.position.set(x, y, z);
    if (this.sunMesh) this.sunMesh.position.copy(this.sunLight.position).multiplyScalar(1.6);
  };
})();
