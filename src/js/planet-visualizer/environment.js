(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  function smoothstep(edge0, edge1, value) {
    const span = Math.max(1e-6, edge1 - edge0);
    const t = Math.max(0, Math.min(1, (value - edge0) / span));
    return t * t * (3 - 2 * t);
  }

  PlanetVisualizer.prototype.updateOverlayText = function updateOverlayText() {
    const overlay = this.elements.overlay;
    if (!overlay) return;

    const colonists = resources.colony.colonists.value;
    const co2MassTon = resources.atmospheric.carbonDioxide.value;
    const g = currentPlanetParameters.celestialParameters.gravity;
    const radiusKm = currentPlanetParameters.celestialParameters.radius;

    const pa = calculateAtmosphericPressure(co2MassTon, g, radiusKm);
    const kPa = pa / 1000;

    const popText = formatNumber(colonists);
    const kPaText = (Math.abs(kPa) < 1000) ? kPa.toFixed(2) : kPa.toExponential(2);

    const overlayText = t('ui.planetVisualizer.environmentOverlay', { population: popText, co2: kPaText }, 'Pop: {population}\nCO2: {co2} kPa');
    if (overlay.textContent !== overlayText) {
      overlay.textContent = overlayText;
    }
  };

  PlanetVisualizer.prototype.createStarField = function createStarField() {
    const starCount = 1200;
    const radius = 60;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.starField = new THREE.Points(geometry, material);
    this.starField.renderOrder = -10;
    this.scene.add(this.starField);
  };

  PlanetVisualizer.prototype.createCityLights = function createCityLights() {
    if (!this.sphere) return;
    this.cityLightsGroup = new THREE.Group();
    this.sphere.add(this.cityLightsGroup);

    if (
      !this.renderer.capabilities.isWebGL2
      && !this.renderer.extensions.has('ANGLE_instanced_arrays')
    ) {
      const geometry = new THREE.SphereGeometry(0.003, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xffd447 });
      for (let i = 0; i < this.maxCityLights; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const radius = 1.005;
        const light = new THREE.Mesh(geometry, material.clone());
        light.position.set(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        );
        light.visible = false;
        this.cityLightsGroup.add(light);
        this.cityLights.push(light);
      }
      this.cityLightsMesh = null;
      return;
    }

    const geometry = new THREE.SphereGeometry(0.003, 8, 8);
    const uniforms = {
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
      scale: { value: 1 },
    };
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.cityLightSunDir = uniforms.sunDir;
      shader.uniforms.cityLightScale = uniforms.scale;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vCityLightWorldCenter;
          uniform float cityLightScale;`
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position) * cityLightScale;
          vCityLightWorldCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vCityLightWorldCenter;
          uniform vec3 cityLightSunDir;`
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          if (dot(normalize(vCityLightWorldCenter), cityLightSunDir) > 0.0) discard;`
        );
    };
    material.customProgramCacheKey = () => 'planet-city-lights-instanced-v1';

    let mesh = null;
    const matrix = new THREE.Matrix4();
    const baseColor = new THREE.Color(0xffd447);

    for (let i = 0; i < this.maxCityLights; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.005;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      // Preserve the UUID random draws made by the old material clone and Mesh.
      THREE.MathUtils.generateUUID();
      if (i === 0) {
        mesh = new THREE.InstancedMesh(geometry, material, this.maxCityLights);
        this.cityLightsGroup.add(mesh);
      } else {
        THREE.MathUtils.generateUUID();
      }

      matrix.makeTranslation(x, y, z);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, baseColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false;

    this.cityLightsMesh = mesh;
    this.cityLights = [];
    this.cityLightsUniforms = uniforms;
    this._cityLightsUseEcumenopolisColors = false;
  };

  PlanetVisualizer.prototype.updateCityLights = function updateCityLights() {
    const pop = this.getCurrentPopulation();
    const ecumenopolis = this.getEcumenopolisVisualizerStrength();
    const populationTarget = Math.floor(pop / 1_000_000);
    const ecumenopolisTarget = Math.floor(smoothstep(0.01, 0.48, ecumenopolis) * this.maxCityLights);
    const target = Math.max(0, Math.min(this.maxCityLights, Math.max(populationTarget, ecumenopolisTarget)));

    const mesh = this.cityLightsMesh;
    if (!mesh) {
      this.lastCityLightCount = target;
      const sunDirection = this.sunLight
        ? this.sunLight.position.clone().normalize()
        : new THREE.Vector3(1, 0, 0);
      const worldPosition = new THREE.Vector3();
      for (let i = 0; i < this.maxCityLights; i++) {
        const light = this.cityLights[i];
        if (i >= target) {
          light.visible = false;
          continue;
        }
        if (ecumenopolis > 0) {
          light.scale.setScalar(1 + ecumenopolis * 0.45);
          light.material.color.setHex(i % 5 === 0 ? 0xfff1a6 : 0xffc928);
        } else {
          light.scale.setScalar(1);
          light.material.color.setHex(0xffd447);
        }
        light.getWorldPosition(worldPosition);
        light.visible = worldPosition.normalize().dot(sunDirection) <= 0;
      }
      return;
    }

    const uniforms = this.cityLightsUniforms;
    const useEcumenopolisColors = ecumenopolis > 0;
    if (useEcumenopolisColors !== this._cityLightsUseEcumenopolisColors) {
      const baseColor = new THREE.Color(0xffd447);
      const brightCityColor = new THREE.Color(0xfff1a6);
      const cityColor = new THREE.Color(0xffc928);
      for (let i = 0; i < this.maxCityLights; i++) {
        mesh.setColorAt(
          i,
          useEcumenopolisColors
            ? (i % 5 === 0 ? brightCityColor : cityColor)
            : baseColor
        );
      }
      mesh.instanceColor.needsUpdate = true;
      this._cityLightsUseEcumenopolisColors = useEcumenopolisColors;
    }

    uniforms.scale.value = useEcumenopolisColors ? 1 + ecumenopolis * 0.45 : 1;
    uniforms.sunDir.value.copy(this.sunLight.position).normalize();
    mesh.count = target;
    mesh.visible = target > 0;
    this.lastCityLightCount = target;
  };
})();
