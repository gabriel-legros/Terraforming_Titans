(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;
  const STELLAR_EMBER_COLOR = new THREE.Color(0xff4f1f);
  const STELLAR_WARM_COLOR = new THREE.Color(0xffad5c);
  const STELLAR_SUNLIGHT_COLOR = new THREE.Color(0xfff2d6);
  const STELLAR_BLUE_WHITE_COLOR = new THREE.Color(0xc6dcff);

  PlanetVisualizer.prototype.getStellarVisualizerState = function getStellarVisualizerState() {
    const state = getStellarEvolutionState(this.terraforming, currentPlanetParameters);
    const active = state.eligible && state.stage !== 'planetary';
    const progress = active
      ? (state.stage === 'star' ? 1 : Math.max(0, Math.min(1, state.absorptionProgress)))
      : 0;
    const temperatureK = Math.max(900, state.effectiveTemperatureK || 900);
    const visual = this.stellarVisualState;
    if (temperatureK < 2500) {
      visual.color.lerpColors(
        STELLAR_EMBER_COLOR,
        STELLAR_WARM_COLOR,
        Math.max(0, Math.min(1, (temperatureK - 900) / 1600))
      );
    } else if (temperatureK < 5772) {
      visual.color.lerpColors(
        STELLAR_WARM_COLOR,
        STELLAR_SUNLIGHT_COLOR,
        (temperatureK - 2500) / 3272
      );
    } else {
      visual.color.lerpColors(
        STELLAR_SUNLIGHT_COLOR,
        STELLAR_BLUE_WHITE_COLOR,
        Math.max(0, Math.min(1, (temperatureK - 5772) / 4228))
      );
    }
    const temperatureBoost = Math.max(
      0,
      Math.min(1, Math.log(temperatureK / 2500) / Math.log(4))
    );
    visual.active = active;
    visual.isStar = state.stage === 'star';
    visual.progress = progress;
    visual.surfaceEmission = progress * (0.45 + progress * 1.25 + temperatureBoost * 0.55);
    visual.haloStrength = progress * (0.18 + progress * 0.72 + temperatureBoost * 0.2);
    return visual;
  };

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

    const stellarGlowUniforms = {
      glowStrength: { value: 0 },
      glowColor: { value: new THREE.Color(0xffad5c) },
    };
    const stellarGlowFrag = `
      precision mediump float;
      varying vec3 vWorldPos;
      uniform float glowStrength;
      uniform vec3 glowColor;
      uniform float alphaScale;

      void main() {
        vec3 N = normalize(vWorldPos);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = 1.0 - clamp(dot(N, V), 0.0, 1.0);
        float halo = pow(smoothstep(0.05, 1.0, rim), 1.35);
        float alpha = halo * glowStrength * alphaScale;
        vec3 color = glowColor * mix(0.72, 1.42, rim);
        gl_FragColor = vec4(color, alpha);
      }
    `;
    const makeStellarGlowMaterial = (alphaScale) => new THREE.ShaderMaterial({
      vertexShader: auraVtx,
      fragmentShader: stellarGlowFrag,
      uniforms: {
        glowStrength: stellarGlowUniforms.glowStrength,
        glowColor: stellarGlowUniforms.glowColor,
        alphaScale: { value: alphaScale },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stellarGlowInnerMaterial = makeStellarGlowMaterial(0.3);
    this.stellarGlowOuterMaterial = makeStellarGlowMaterial(0.07);
    this.stellarGlowInnerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 48, 32),
      this.stellarGlowInnerMaterial
    );
    this.stellarGlowOuterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.14, 48, 32),
      this.stellarGlowOuterMaterial
    );
    this.stellarGlowInnerMesh.visible = false;
    this.stellarGlowOuterMesh.visible = false;
    this.stellarGlowInnerMesh.renderOrder = 4;
    this.stellarGlowOuterMesh.renderOrder = 3;
    this.scene.add(this.stellarGlowInnerMesh);
    this.scene.add(this.stellarGlowOuterMesh);

    const stellarGlowCanvas = document.createElement('canvas');
    stellarGlowCanvas.width = 256;
    stellarGlowCanvas.height = 256;
    const stellarGlowContext = stellarGlowCanvas.getContext('2d');
    const stellarGlowGradient = stellarGlowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
    stellarGlowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    stellarGlowGradient.addColorStop(0.56, 'rgba(255, 255, 255, 0.14)');
    stellarGlowGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.42)');
    stellarGlowGradient.addColorStop(0.76, 'rgba(255, 255, 255, 0.56)');
    stellarGlowGradient.addColorStop(0.84, 'rgba(255, 255, 255, 0.2)');
    stellarGlowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    stellarGlowContext.fillStyle = stellarGlowGradient;
    stellarGlowContext.fillRect(0, 0, 256, 256);
    const stellarGlowTexture = new THREE.CanvasTexture(stellarGlowCanvas);
    stellarGlowTexture.minFilter = THREE.LinearFilter;
    stellarGlowTexture.magFilter = THREE.LinearFilter;
    this.stellarGlowSpriteMaterial = new THREE.SpriteMaterial({
      map: stellarGlowTexture,
      color: 0xffad5c,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stellarGlowSprite = new THREE.Sprite(this.stellarGlowSpriteMaterial);
    this.stellarGlowSprite.scale.set(2.8, 2.8, 1);
    this.stellarGlowSprite.visible = false;
    this.stellarGlowSprite.renderOrder = 2;
    this.scene.add(this.stellarGlowSprite);
  };

  PlanetVisualizer.prototype.updateAtmosphereUniforms = function updateAtmosphereUniforms() {
    const useDebugIllum = this.debug && this.debug.mode === 'debug';
    const illumSource = useDebugIllum ? this.viz?.illum : this.getGameIllumination();
    const illum = Math.max(0, Math.min(3, Number(illumSource) || 0));
    const stellarVisual = this.getStellarVisualizerState();
    if (this.sunLight) this.sunLight.intensity = illum;
    if (this.isDiskWorld() && this.ambientLight) {
      this.ambientLight.intensity = 0.8;
    }
    if (this.sunMesh) {
      if (this.isRingWorld() || stellarVisual.isStar) {
        this.sunMesh.visible = false;
      } else if (this.isDiskWorld()) {
        this.sunMesh.visible = true;
        this.sunMesh.scale.setScalar(0.2);
      } else {
        this.sunMesh.visible = illum >= 0.01;
        this.sunMesh.scale.setScalar(illum);
      }
    }
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
    const inertKpa = this.computeInertPressureKPa();
    const auraStrength = Math.max(0, Math.min(1, inertKpa / 80))
      * (1 - stellarVisual.progress);
    this.inertAuraInnerMaterial.uniforms.auraStrength.value = auraStrength;
    this.inertAuraOuterMaterial.uniforms.auraStrength.value = auraStrength;
    const showStellarGlow = stellarVisual.progress > 0.001;
    this.stellarGlowInnerMesh.visible = showStellarGlow;
    this.stellarGlowOuterMesh.visible = showStellarGlow;
    this.stellarGlowSprite.visible = showStellarGlow;
    this.stellarGlowInnerMaterial.uniforms.glowStrength.value = stellarVisual.haloStrength;
    this.stellarGlowOuterMaterial.uniforms.glowStrength.value = stellarVisual.haloStrength;
    this.stellarGlowInnerMaterial.uniforms.glowColor.value.copy(stellarVisual.color);
    this.stellarGlowSpriteMaterial.color.copy(stellarVisual.color);
    this.stellarGlowSpriteMaterial.opacity = Math.min(0.72, stellarVisual.haloStrength * 0.56);
  };

  PlanetVisualizer.prototype.updateSunFromInclination = function updateSunFromInclination() {
    if (!this.sunLight) return;
    if (this.isSmbhShellWorld()) {
      this.sunLight.position.set(5, 3, 2);
      this.sunLight.intensity = 1.35;
      if (this.ambientLight) this.ambientLight.intensity = 0.34;
      if (this.sunMesh) this.sunMesh.visible = false;
      return;
    }
    if (this.isRingWorld()) {
      this.sunLight.position.set(0, 0, 0);
      this.sunMesh.visible = false;
      return;
    }
    if (this.isDiskWorld()) {
      this.sunLight.position.set(0, 0.04, 0);
      if (this.sunMesh) {
        this.sunMesh.position.set(0, 0.035, 0);
        this.sunMesh.visible = true;
      }
      return;
    }
    const deg = (this.viz?.inclinationDeg ?? 15);
    const elev = deg * Math.PI / 180;
    const az = Math.atan2(2, 5);
    const r = 6.0;
    const x = r * Math.cos(elev) * Math.cos(az);
    const y = r * Math.sin(elev);
    const z = r * Math.cos(elev) * Math.sin(az);
    this.sunLight.position.set(x, y, z);
    if (this.sunMesh) {
      this.sunMesh.position.copy(this.sunLight.position).multiplyScalar(1.6);
      this.sunMesh.visible = true;
    }
  };
})();
