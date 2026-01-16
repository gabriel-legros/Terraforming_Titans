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

    const auraUniforms = {
      auraStrength: { value: 0.0 },
      auraColor: { value: new THREE.Color(0x5fb5ff) },
      alphaScale: { value: 1.0 },
      noiseScale: { value: 12.0 },
      colorScale: { value: 1.0 },
    };
    const auraVtx = `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;
    const auraFrag = `
      precision mediump float;
      varying vec3 vWorldPos;
      uniform float auraStrength;
      uniform vec3 auraColor;
      uniform float alphaScale;
      uniform float noiseScale;
      uniform float colorScale;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec3 N = normalize(vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = 1.0 - clamp(dot(N, V), 0.0, 1.0);
        float glow = smoothstep(0.0, 0.8, rim);
        float fade = smoothstep(0.2, 0.95, rim);
        float n = noise(N.xy * noiseScale) * 0.6 + noise(N.yz * (noiseScale * 0.7)) * 0.4;
        float grain = 0.75 + 0.35 * n;
        float alpha = glow * fade * auraStrength * alphaScale * grain;
        vec3 col = mix(auraColor * 0.55, auraColor * (1.25 * colorScale), glow);
        gl_FragColor = vec4(col, alpha);
      }
    `;
    const makeAuraMaterial = (alphaScale, noiseScale, colorScale) => {
      const uniforms = {
        auraStrength: auraUniforms.auraStrength,
        auraColor: auraUniforms.auraColor,
        alphaScale: { value: alphaScale },
        noiseScale: { value: noiseScale },
        colorScale: { value: colorScale },
      };
      return new THREE.ShaderMaterial({
        vertexShader: auraVtx,
        fragmentShader: auraFrag,
        uniforms,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    };
    const innerGeo = new THREE.SphereGeometry(1.01, 48, 32);
    const outerGeo = new THREE.SphereGeometry(1.04, 48, 32);
    this.inertAuraInnerMaterial = makeAuraMaterial(0.6, 11.0, 1.05);
    this.inertAuraOuterMaterial = makeAuraMaterial(0.25, 16.0, 0.95);
    this.inertAuraInnerMesh = new THREE.Mesh(innerGeo, this.inertAuraInnerMaterial);
    this.inertAuraOuterMesh = new THREE.Mesh(outerGeo, this.inertAuraOuterMaterial);
    this.scene.add(this.inertAuraInnerMesh);
    this.scene.add(this.inertAuraOuterMesh);
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
    const isRogueWorld = currentPlanetParameters?.celestialParameters?.rogue === true;
    this.sunMesh.visible = !isRogueWorld;
    const inertKpa = this.computeInertPressureKPa();
    const auraStrength = Math.max(0, Math.min(1, inertKpa / 80));
    this.inertAuraInnerMaterial.uniforms.auraStrength.value = auraStrength;
    this.inertAuraOuterMaterial.uniforms.auraStrength.value = auraStrength;
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
