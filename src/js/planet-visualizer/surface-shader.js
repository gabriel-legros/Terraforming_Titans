(function () {
  const PlanetVisualizer = window.PlanetVisualizer;

  const SURFACE_SHADER_UPDATE_INTERVAL_MS = 5000;
  const TROPICAL_EDGE = 23.5 / 90;
  const POLAR_EDGE = 66.5 / 90;
  const cpuSurfaceUpdate = PlanetVisualizer.prototype.updateSurfaceTextureFromPressure;
  const cpuResetSurfaceThrottle = PlanetVisualizer.prototype.resetSurfaceTextureThrottle;

  const clamp01 = value => Math.max(0, Math.min(1, value));

  function canUseSurfaceShader(context) {
    return context.renderer.capabilities.isWebGL2
      && context.renderer.extensions.has('EXT_color_buffer_float');
  }

  function smoothstep(edge0, edge1, value) {
    const amount = clamp01((value - edge0) / Math.max(0.000001, edge1 - edge0));
    return amount * amount * (3 - 2 * amount);
  }

  function getCoverage(context, key) {
    const zonal = context.viz.zonalCoverage;
    return [
      clamp01(zonal.tropical[key] || 0),
      clamp01(zonal.temperate[key] || 0),
      clamp01(zonal.polar[key] || 0),
    ];
  }

  function getSurfaceShaderDynamicKey(context) {
    const water = getCoverage(context, 'water');
    const ice = getCoverage(context, 'ice');
    const life = getCoverage(context, 'life');
    const hazardousLife = getCoverage(context, 'hazardousLife');
    const specialSurface = context.getDominionSurfaceVisualState();
    const factor = context.isStellarWorld()
      ? 0
      : clamp01(1 - context.computeTotalPressureKPa() / 100);
    return [
      factor.toFixed(2),
      ...water.map(value => value.toFixed(2)),
      ...ice.map(value => value.toFixed(2)),
      ...life.map(value => value.toFixed(2)),
      ...hazardousLife.map(value => value.toFixed(2)),
      specialSurface.style,
      ...specialSurface.coverage.map(value => value.toFixed(2)),
      getActiveBiomassColor(),
      context.getEcumenopolisVisualizerStrength().toFixed(2),
      context.getNanoworldVisualizerStrength().toFixed(2),
    ].join('|');
  }

  function getSurfaceShaderStaticKey(context) {
    const size = context.getSurfaceTextureSize();
    const seed = context.hashSeedFromPlanet();
    const dustKey = context.getDustTintColorKey();
    const features = context.viz.surfaceFeatures;
    const baseColor = context.normalizeHexColor(context.viz.baseColor);
    const archetype = context.resolveSurfaceArchetype(baseColor);
    return [
      `${size.w}x${size.h}`,
      `${seed.x}:${seed.y}`,
      baseColor,
      dustKey,
      archetype,
      context.viz.heightMapKey || currentPlanetParameters.visualization?.heightMapKey || '',
      features.enabled ? 1 : 0,
      Number(features.strength || 0).toFixed(2),
      Number(features.scale || 0).toFixed(2),
      Number(features.contrast || 0).toFixed(2),
      Number(features.offsetX || 0).toFixed(2),
      Number(features.offsetY || 0).toFixed(2),
    ].join('|');
  }

  function createRawCanvasTexture(context, sourceCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    canvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = context.isDiskWorld() ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function createFloatTexture(data, width, height) {
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  }

  function createBlackTexture() {
    const texture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function saveDynamicCoverage(context) {
    const zonal = context.viz.zonalCoverage;
    return {
      coverage: {
        water: context.viz.coverage.water,
        life: context.viz.coverage.life,
        hazardousLife: context.viz.coverage.hazardousLife,
        fineSand: context.viz.coverage.fineSand,
        yggieOvergrowth: context.viz.coverage.yggieOvergrowth,
        swamp: context.viz.coverage.swamp,
        klishyWeb: context.viz.coverage.klishyWeb,
        ecumenopolis: context.viz.coverage.ecumenopolis,
        nanoworld: context.viz.coverage.nanoworld,
      },
      zonal: {
        tropical: { ...zonal.tropical },
        temperate: { ...zonal.temperate },
        polar: { ...zonal.polar },
      },
    };
  }

  function clearDynamicCoverage(context) {
    const zonal = context.viz.zonalCoverage;
    for (const zone of ['tropical', 'temperate', 'polar']) {
      zonal[zone].water = 0;
      zonal[zone].ice = 0;
      zonal[zone].life = 0;
      zonal[zone].hazardousLife = 0;
      zonal[zone].fineSand = 0;
    }
    context.viz.coverage.water = 0;
    context.viz.coverage.life = 0;
    context.viz.coverage.hazardousLife = 0;
    context.viz.coverage.fineSand = 0;
    context.viz.coverage.yggieOvergrowth = 0;
    context.viz.coverage.swamp = 0;
    context.viz.coverage.klishyWeb = 0;
    context.viz.coverage.ecumenopolis = 0;
    context.viz.coverage.nanoworld = 0;
  }

  function restoreDynamicCoverage(context, saved) {
    const zonal = context.viz.zonalCoverage;
    for (const zone of ['tropical', 'temperate', 'polar']) {
      Object.assign(zonal[zone], saved.zonal[zone]);
    }
    Object.assign(context.viz.coverage, saved.coverage);
  }

  function findAscendingThreshold(histogram, fraction, interpolate) {
    const target = clamp01(fraction) * histogram.total;
    if (target <= 0 || histogram.total === 0) return -1;
    let accumulated = 0;
    for (let bin = 0; bin < 256; bin++) {
      accumulated += histogram.counts[bin];
      if (accumulated < target) continue;
      if (!interpolate) return bin / 255;
      const previous = accumulated - histogram.counts[bin];
      const remainder = target - previous;
      const ratio = histogram.counts[bin] ? clamp01(remainder / histogram.counts[bin]) : 0;
      return clamp01((bin + ratio) / 255);
    }
    return 1;
  }

  function findDescendingThreshold(histogram, fraction) {
    const target = clamp01(fraction) * histogram.total;
    if (target <= 0 || histogram.total === 0) return -1;
    let accumulated = 0;
    for (let bin = 255; bin >= 0; bin--) {
      accumulated += histogram.counts[bin];
      if (accumulated < target) continue;
      const previous = accumulated - histogram.counts[bin];
      const remainder = target - previous;
      const ratio = histogram.counts[bin] ? clamp01(remainder / histogram.counts[bin]) : 0;
      return clamp01((bin + (1 - ratio)) / 255);
    }
    return 0;
  }

  function findCityThreshold(histogram, fraction) {
    const target = Math.max(
      1,
      Math.min(histogram.total, Math.round(clamp01(fraction) * histogram.total))
    );
    let accumulated = 0;
    for (let bin = 255; bin >= 0; bin--) {
      accumulated += histogram.counts[bin];
      if (accumulated >= target) return bin / 255;
    }
    return 0;
  }

  function createHistograms() {
    return [
      { counts: new Uint32Array(256), total: 0 },
      { counts: new Uint32Array(256), total: 0 },
      { counts: new Uint32Array(256), total: 0 },
    ];
  }

  function getZoneIndex(y, height) {
    const latitude = Math.min(1, Math.abs(y / Math.max(1, height - 1) - 0.5) * 2);
    if (latitude >= POLAR_EDGE) return 2;
    if (latitude >= TROPICAL_EDGE) return 1;
    return 0;
  }

  function setVector3(vector, values) {
    vector.set(values[0], values[1], values[2]);
  }

  function buildLifeFields(context, state) {
    if (state.lifeFieldsReady) return;
    const { w, h } = state;
    const seed = context.hashSeedFromPlanet();
    const seedValue = Math.floor((seed.x * 65535) ^ (seed.y * 131071)) >>> 0;
    const lifeNoise = context.getLifeNoiseField(w, h);
    const hash = (x, y) => {
      const value = Math.sin(x * 12.9898 + y * 78.233 + seedValue * 0.00011) * 43758.5453;
      return value - Math.floor(value);
    };
    const patchNoise = (x, y) => {
      const scale = 0.07;
      const warpX = (hash(x * 0.18, y * 0.18) - 0.5) * 1.2;
      const warpY = (hash(x * 0.18 + 41.7, y * 0.18 - 19.3) - 0.5) * 1.2;
      const px = (x + warpX) * scale;
      const py = (y + warpY) * scale;
      const xi = Math.floor(px);
      const yi = Math.floor(py);
      const xf = px - xi;
      const yf = py - yi;
      const blendX = xf * xf * (3 - 2 * xf);
      const blendY = yf * yf * (3 - 2 * yf);
      const a = hash(xi, yi);
      const b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1);
      const d = hash(xi + 1, yi + 1);
      const base = (a * (1 - blendX) + b * blendX) * (1 - blendY)
        + (c * (1 - blendX) + d * blendX) * blendY;
      const detail = hash(x * 0.38 + base * 5.2, y * 0.38 - base * 4.1);
      return clamp01(base * 0.9 + detail * 0.1);
    };
    const buildBoundaryField = seedOffset => {
      const field = new Float32Array(w);
      const periodicNoise = (position, cells, octaveOffset) => {
        const scaled = position * cells;
        const cell = Math.floor(scaled);
        const fraction = scaled - cell;
        const blend = fraction * fraction * (3 - 2 * fraction);
        const a = hash(cell % cells, seedOffset + octaveOffset);
        const b = hash((cell + 1) % cells, seedOffset + octaveOffset);
        return a * (1 - blend) + b * blend;
      };
      for (let sample = 0; sample < w; sample++) {
        const position = sample / w;
        const broad = periodicNoise(position, 5, 0);
        const medium = periodicNoise(position, 13, 31.7);
        const detail = periodicNoise(position, 37, 73.1);
        field[sample] = (broad - 0.5) * 0.9
          + (medium - 0.5) * 0.65
          + (detail - 0.5) * 0.35;
      }
      return field;
    };
    const boundaryFields = [
      buildBoundaryField(11.3),
      buildBoundaryField(29.7),
      buildBoundaryField(47.1),
      buildBoundaryField(83.9),
    ];

    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const x = i - y * w;
      const fieldOffset = i * 4;
      const patch = patchNoise(x, y);
      const latitude = Math.min(1, Math.abs(y / Math.max(1, h - 1) - 0.5) * 2);
      const hemisphere = y < h / 2 ? 0 : 1;
      const intrusion = (lifeNoise[i] - 0.5) * 0.14 + (patch - 0.5) * 0.12;
      const tropicalPosition = latitude + boundaryFields[hemisphere][x] * 0.04 + intrusion;
      const polarPosition = latitude + boundaryFields[2 + hemisphere][x] * 0.04 + intrusion;
      let tropicalWeight = 1 - smoothstep(TROPICAL_EDGE - 0.06, TROPICAL_EDGE + 0.06, tropicalPosition);
      let polarWeight = smoothstep(POLAR_EDGE - 0.06, POLAR_EDGE + 0.06, polarPosition);
      let temperateWeight = Math.max(0, 1 - tropicalWeight - polarWeight);
      const weightTotal = tropicalWeight + temperateWeight + polarWeight;
      if (weightTotal > 0) {
        tropicalWeight /= weightTotal;
        temperateWeight /= weightTotal;
        polarWeight /= weightTotal;
      }

      state.field0Data[fieldOffset + 2] = lifeNoise[i];
      state.field0Data[fieldOffset + 3] = patch;
      state.field1Data[fieldOffset] = hash(x * 2, y * 2);
      state.field1Data[fieldOffset + 1] = patchNoise(x + 61.7, y - 38.4);
      state.field1Data[fieldOffset + 2] = tropicalWeight;
      state.field1Data[fieldOffset + 3] = polarWeight;
    }
    state.field0Texture.needsUpdate = true;
    state.field1Texture.needsUpdate = true;
    state.lifeFieldsReady = true;
  }

  function buildCoreFields(context, state) {
    const { w, h } = state;
    const length = w * h;
    const heightMap = context.heightMap;
    const iceNoise = context.getIceNoiseField(w, h);
    state.field0Data = new Float32Array(length * 4);
    state.field1Data = new Float32Array(length * 4);
    for (let i = 0; i < length; i++) {
      const offset = i * 4;
      state.field0Data[offset] = heightMap[i];
      state.field0Data[offset + 1] = iceNoise[i];
    }
    state.field0Texture = createFloatTexture(state.field0Data, w, h);
    state.field1Texture = createFloatTexture(state.field1Data, w, h);
    state.textures.push(state.field0Texture, state.field1Texture);

    const life = getCoverage(context, 'life');
    const hazardousLife = getCoverage(context, 'hazardousLife');
    if (life.some(value => value > 0) || hazardousLife.some(value => value > 0)) {
      buildLifeFields(context, state);
    }

    const archetype = context.resolveSurfaceArchetype(
      context.normalizeHexColor(context.viz.baseColor)
    );
    state.artificial = archetype === 'artificial';
    state.mountainThreshold = 1;
    if (!state.artificial) {
      const histograms = context.heightZoneHists;
      const total = histograms[0].total + histograms[1].total + histograms[2].total;
      const target = total * 0.92;
      let accumulated = 0;
      for (let bin = 0; bin < 256; bin++) {
        accumulated += histograms[0].counts[bin]
          + histograms[1].counts[bin]
          + histograms[2].counts[bin];
        if (accumulated >= target) {
          state.mountainThreshold = bin / 255;
          break;
        }
      }
    }
  }

  function createCompositor(context, state) {
    const uniforms = {
      baseWithoutCraters: { value: state.baseWithoutCraters },
      baseWithCraters: { value: state.baseWithCraters },
      field0: { value: state.field0Texture },
      field1: { value: state.field1Texture },
      cityScoreMap: { value: state.blackTexture },
      nanoAttributesMap: { value: state.blackTexture },
      craterFactor: { value: 0 },
      waterCoverage: { value: new THREE.Vector3() },
      waterThresholds: { value: new THREE.Vector3(-1, -1, -1) },
      iceCoverage: { value: new THREE.Vector3() },
      iceThresholds: { value: new THREE.Vector3(-1, -1, -1) },
      iceFromPoles: { value: 0 },
      lifeCoverage: { value: new THREE.Vector3() },
      lifeThresholds: { value: new THREE.Vector3(-1, -1, -1) },
      lifePaletteBase: { value: new THREE.Vector3() },
      lifePaletteLow: { value: new THREE.Vector3() },
      lifePaletteHigh: { value: new THREE.Vector3() },
      hazardousCoverage: { value: new THREE.Vector3() },
      hazardousThresholds: { value: new THREE.Vector3(-1, -1, -1) },
      specialSurfaceStyle: { value: 0 },
      specialSurfaceThresholds: { value: new THREE.Vector3(-1, -1, -1) },
      mountainThreshold: { value: state.mountainThreshold },
      artificialSurface: { value: state.artificial ? 1 : 0 },
      cityStrength: { value: 0 },
      cityThreshold: { value: -1 },
      citySoftness: { value: 0.05 },
      cityReady: { value: 0 },
      nanoStrength: { value: 0 },
      nanoReady: { value: 0 },
      outputEmission: { value: 0 },
      textureSize: { value: new THREE.Vector2(state.w, state.h) },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform sampler2D baseWithoutCraters;
        uniform sampler2D baseWithCraters;
        uniform sampler2D field0;
        uniform sampler2D field1;
        uniform sampler2D cityScoreMap;
        uniform sampler2D nanoAttributesMap;
        uniform float craterFactor;
        uniform vec3 waterCoverage;
        uniform vec3 waterThresholds;
        uniform vec3 iceCoverage;
        uniform vec3 iceThresholds;
        uniform float iceFromPoles;
        uniform vec3 lifeCoverage;
        uniform vec3 lifeThresholds;
        uniform vec3 lifePaletteBase;
        uniform vec3 lifePaletteLow;
        uniform vec3 lifePaletteHigh;
        uniform vec3 hazardousCoverage;
        uniform vec3 hazardousThresholds;
        uniform float specialSurfaceStyle;
        uniform vec3 specialSurfaceThresholds;
        uniform float mountainThreshold;
        uniform float artificialSurface;
        uniform float cityStrength;
        uniform float cityThreshold;
        uniform float citySoftness;
        uniform float cityReady;
        uniform float nanoStrength;
        uniform float nanoReady;
        uniform float outputEmission;
        uniform vec2 textureSize;
        varying vec2 vUv;

        float surfaceSmoothstep(float edge0, float edge1, float value) {
          float amount = clamp((value - edge0) / max(0.000001, edge1 - edge0), 0.0, 1.0);
          return amount * amount * (3.0 - 2.0 * amount);
        }

        vec3 byteRound(vec3 value) {
          return floor(clamp(value, 0.0, 1.0) * 255.0 + 0.5) / 255.0;
        }

        vec3 srgbToLinear(vec3 value) {
          vec3 low = value * 0.0773993808;
          vec3 high = pow(value * 0.9478672986 + vec3(0.0521327014), vec3(2.4));
          return mix(high, low, vec3(lessThanEqual(value, vec3(0.04045))));
        }

        float topPixelY() {
          return clamp(floor((1.0 - vUv.y) * textureSize.y), 0.0, textureSize.y - 1.0);
        }

        float latitudeAbs() {
          return min(1.0, abs(topPixelY() / max(1.0, textureSize.y - 1.0) - 0.5) * 2.0);
        }

        float zoneValue(vec3 values) {
          float latitude = latitudeAbs();
          if (latitude >= ${POLAR_EDGE.toFixed(12)}) return values.z;
          if (latitude >= ${TROPICAL_EDGE.toFixed(12)}) return values.y;
          return values.x;
        }

        float waterAlpha(float height) {
          float threshold = zoneValue(waterThresholds);
          if (threshold < 0.0) return 0.0;
          return 1.0 - surfaceSmoothstep(
            max(0.0, threshold - 0.06),
            min(1.0, threshold + 0.06),
            height
          );
        }

        vec3 zoneWeights() {
          float latitude = latitudeAbs();
          float tropical = 1.0 - surfaceSmoothstep(
            ${TROPICAL_EDGE.toFixed(12)} - 0.06,
            ${TROPICAL_EDGE.toFixed(12)} + 0.06,
            latitude
          );
          float polar = surfaceSmoothstep(
            ${POLAR_EDGE.toFixed(12)} - 0.06,
            ${POLAR_EDGE.toFixed(12)} + 0.06,
            latitude
          );
          float temperate = max(0.0, 1.0 - tropical - polar);
          return vec3(tropical, temperate, polar)
            / max(0.000001, tropical + temperate + polar);
        }

        float activeWeightedAlpha(vec3 weights, vec3 thresholds, float score, float softness, bool descending) {
          float alphaSum = 0.0;
          float weightSum = 0.0;
          for (int zone = 0; zone < 3; zone++) {
            float threshold = thresholds[zone];
            float weight = weights[zone];
            if (threshold < 0.0 || weight <= 0.0) continue;
            weightSum += weight;
            float lower = max(0.0, threshold - softness);
            float upper = min(1.0, threshold + softness);
            float alpha = surfaceSmoothstep(lower, upper, score);
            if (!descending) alpha = 1.0 - alpha;
            alphaSum += alpha * weight;
          }
          return weightSum > 0.0 ? alphaSum / weightSum : 0.0;
        }

        vec3 applyLife(
          vec3 color,
          vec3 coverage,
          vec3 thresholds,
          vec3 paletteBase,
          vec3 paletteLow,
          vec3 paletteHigh,
          float height,
          float lifeNoise,
          float lifePatch,
          float micro,
          float densityPatch,
          vec3 weights,
          float water
        ) {
          if (coverage.x <= 0.0 && coverage.y <= 0.0 && coverage.z <= 0.0) return color;
          float waterThreshold = zoneValue(waterThresholds);
          if (waterThreshold >= 0.0) {
            float heightBin = floor(clamp(height, 0.0, 1.0) * 255.0);
            float thresholdBin = floor(waterThreshold * 255.0 + 0.5);
            if (heightBin <= thresholdBin) return color;
          }

          float score = clamp(
            lifeNoise * 0.55
            + lifePatch * 0.25
            + (1.0 - latitudeAbs()) * 0.1
            + (1.0 - height) * 0.05
            - water * 0.35,
            0.0,
            1.0
          );
          float alphaSum = 0.0;
          for (int zone = 0; zone < 3; zone++) {
            float fraction = coverage[zone];
            float threshold = thresholds[zone];
            if (fraction <= 0.0 || threshold < 0.0 || weights[zone] <= 0.0) continue;
            float zoneAlpha = 1.0;
            if (fraction < 0.999999) {
              float adjusted = max(0.0, threshold - 0.02);
              zoneAlpha = surfaceSmoothstep(
                max(0.0, adjusted - 0.16),
                min(1.0, adjusted + 0.16),
                score
              );
            }
            alphaSum += zoneAlpha * weights[zone];
          }
          float lifeFraction = dot(coverage, weights);
          float alpha = clamp(alphaSum * (0.15 + 0.85 * lifeFraction), 0.0, 1.0);
          if (alpha < 0.00001) return color;

          float coarse = pow(lifeNoise, 1.6);
          float tone = clamp(
            0.1 + 0.9 * (0.55 * coarse + 0.25 * (1.0 - height) + 0.2 * micro),
            0.0,
            1.0
          );
          vec3 messy = floor(mix(paletteLow, paletteHigh, tone));
          float messiness = 0.2 + 0.8 * lifeFraction;
          vec3 lifeColor = floor(mix(paletteBase, messy, messiness));
          float grain = 0.88 + 0.18 * micro * messiness;
          float densityNoise = 0.55 * coarse + 0.45 * densityPatch;
          float density = clamp(0.2 + 0.8 * pow(densityNoise, 1.5), 0.0, 1.0);
          alpha = min(0.75, alpha * grain);
          lifeColor = floor(lifeColor * (0.6 + 0.4 * density)) / 255.0;
          if (artificialSurface < 0.5) {
            float peak = surfaceSmoothstep(
              mountainThreshold - 0.05,
              mountainThreshold + 0.02,
              height
            );
            alpha *= 1.0 - 0.7 * peak;
          }
          return byteRound(mix(color, lifeColor, alpha));
        }

        vec3 applySpecialSurface(
          vec3 color,
          float height,
          float water,
          vec3 weights,
          vec4 fieldA,
          vec4 fieldB
        ) {
          if (specialSurfaceStyle < 0.5) return color;
          float score = clamp(
            fieldA.b * 0.5 + fieldA.a * 0.3 + fieldB.g * 0.2 - water * 0.45,
            0.0,
            1.0
          );
          float alpha = activeWeightedAlpha(
            weights,
            specialSurfaceThresholds,
            score,
            0.12,
            true
          );
          if (alpha < 0.001) return color;

          float micro = fieldB.r;
          float surfacePatch = fieldB.g;
          vec3 target;
          if (specialSurfaceStyle < 1.5) {
            float dune = 0.5 + 0.5 * sin((vUv.x * 150.0 + fieldA.a * 8.0) + vUv.y * 32.0);
            target = mix(vec3(151.0, 105.0, 55.0), vec3(224.0, 187.0, 112.0), 0.3 + 0.45 * dune + 0.25 * micro) / 255.0;
            alpha *= 0.92;
          } else if (specialSurfaceStyle < 2.5) {
            float canopy = surfaceSmoothstep(0.3, 0.8, fieldA.b * 0.65 + surfacePatch * 0.35);
            float branch = 1.0 - surfaceSmoothstep(0.025, 0.12, abs(fract(vUv.x * 22.0 + fieldA.a * 2.5) - 0.5));
            target = mix(vec3(18.0, 49.0, 22.0), vec3(60.0, 113.0, 45.0), canopy) / 255.0;
            target = mix(target, vec3(74.0, 48.0, 27.0) / 255.0, branch * 0.28);
            alpha *= 0.96;
          } else if (specialSurfaceStyle < 3.5) {
            float channel = surfaceSmoothstep(0.44, 0.58, fieldA.a * 0.65 + fieldB.r * 0.35);
            target = mix(vec3(43.0, 54.0, 31.0), vec3(47.0, 91.0, 71.0), channel) / 255.0;
            target *= 0.72 + 0.28 * micro;
            alpha *= 0.94;
          } else {
            float longitudeLine = 1.0 - surfaceSmoothstep(0.02, 0.085, abs(fract(vUv.x * 30.0 + fieldA.a * 0.5) - 0.5));
            float latitudeLine = 1.0 - surfaceSmoothstep(0.02, 0.085, abs(fract(vUv.y * 16.0 + fieldA.b * 0.45) - 0.5));
            float wire = max(longitudeLine, latitudeLine);
            vec3 darkMesh = mix(color, vec3(17.0, 21.0, 24.0) / 255.0, 0.5);
            vec3 copper = mix(vec3(147.0, 76.0, 34.0), vec3(96.0, 210.0, 224.0), step(0.82, micro)) / 255.0;
            target = mix(darkMesh, copper, wire * 0.92);
            alpha *= 0.82;
          }
          alpha *= 1.0 - water;
          return byteRound(mix(color, target, clamp(alpha, 0.0, 1.0)));
        }

        void main() {
          vec4 fieldA = texture2D(field0, vUv);
          vec4 fieldB = texture2D(field1, vUv);
          float height = fieldA.r;
          float water = waterAlpha(height);
          vec3 color = byteRound(mix(
            texture2D(baseWithoutCraters, vUv).rgb,
            texture2D(baseWithCraters, vUv).rgb,
            craterFactor
          ));
          color = byteRound(mix(color, vec3(10.0, 40.0, 120.0) / 255.0, water));

          if (iceCoverage.x > 0.0 || iceCoverage.y > 0.0 || iceCoverage.z > 0.0) {
            float latitude = latitudeAbs();
            float latitudeTerm = iceFromPoles > 0.5 ? 1.0 - latitude : latitude;
            float iceScore = clamp(
              pow(max(0.0, latitudeTerm), 0.85) * 0.58
              + fieldA.g * 0.3
              + (1.0 - height) * 0.14
              - water * 0.05,
              0.0,
              1.0
            );
            float iceAlpha = activeWeightedAlpha(
              zoneWeights(),
              iceThresholds,
              iceScore,
              0.08,
              false
            );
            if (iceAlpha < 0.02) iceAlpha = 0.0;
            color = byteRound(mix(color, vec3(200.0, 220.0, 255.0) / 255.0, clamp(iceAlpha, 0.0, 1.0)));
          }

          vec3 lifeWeights = vec3(
            fieldB.b,
            max(0.0, 1.0 - fieldB.b - fieldB.a),
            fieldB.a
          );
          color = applyLife(
            color,
            lifeCoverage,
            lifeThresholds,
            lifePaletteBase,
            lifePaletteLow,
            lifePaletteHigh,
            height,
            fieldA.b,
            fieldA.a,
            fieldB.r,
            fieldB.g,
            lifeWeights,
            water
          );
          color = applySpecialSurface(color, height, water, lifeWeights, fieldA, fieldB);
          color = applyLife(
            color,
            hazardousCoverage,
            hazardousThresholds,
            vec3(130.0, 24.0, 24.0),
            vec3(150.0, 42.0, 34.0),
            vec3(205.0, 36.0, 42.0),
            height,
            fieldA.b,
            fieldA.a,
            fieldB.r,
            fieldB.g,
            lifeWeights,
            water
          );

          float cityMask = 0.0;
          vec3 cityEmission = vec3(0.0);
          if (cityReady > 0.5 && cityStrength > 0.0) {
            vec4 cityAttributes = texture2D(cityScoreMap, vUv);
            if (cityStrength >= 0.995) {
              cityMask = 1.0;
            } else {
              cityMask = surfaceSmoothstep(
                cityThreshold - citySoftness,
                cityThreshold + citySoftness,
                cityAttributes.r
              );
            }
            if (cityMask > 0.002) {
              float cityIntensity = surfaceSmoothstep(0.01, 0.32, cityStrength);
              vec3 metalColor = floor(
                vec3(6.0, 7.0, 8.0)
                + vec3(18.0, 18.0, 20.0) * cityAttributes.g
                + 0.5
              ) / 255.0;
              float metalAlpha = clamp(
                (0.8 + cityIntensity * 0.18) * cityMask,
                0.0,
                1.0
              );
              color = byteRound(mix(color, metalColor, metalAlpha));

              float goldAlpha = clamp(abs(cityAttributes.b) * cityMask, 0.0, 1.0);
              if (goldAlpha > 0.01) {
                vec3 warmGold = vec3(245.0, 188.0, 24.0) / 255.0;
                vec3 whiteGold = vec3(255.0, 244.0, 160.0) / 255.0;
                vec3 goldColor = cityAttributes.b < 0.0 ? whiteGold : warmGold;
                color = byteRound(mix(color, goldColor, goldAlpha));
                cityEmission = byteRound(
                  goldColor * clamp(goldAlpha * cityAttributes.a, 0.0, 1.0)
                );
              }
            }
          }

          if (nanoReady > 0.5 && nanoStrength > 0.0) {
            vec4 nanoAttributes = texture2D(nanoAttributesMap, vUv);
            color = byteRound(mix(
              color,
              nanoAttributes.rgb,
              0.985 * nanoStrength
            ));
          }

          vec3 outputColor = color;
          if (outputEmission > 0.5) {
            outputColor = vec3(0.0);
            if (nanoReady > 0.5 && nanoStrength > 0.0) {
              vec4 nanoAttributes = texture2D(nanoAttributesMap, vUv);
              float emission = abs(nanoAttributes.a) * nanoStrength;
              if (emission > 0.01) {
                vec3 cyanEmission = vec3(32.0, 224.0, 255.0) / 255.0;
                vec3 violetEmission = vec3(180.0, 92.0, 255.0) / 255.0;
                outputColor = (
                  nanoAttributes.a < 0.0 ? violetEmission : cyanEmission
                ) * emission;
              }
            } else if (cityReady > 0.5 && cityStrength > 0.0) {
              outputColor = cityEmission;
            }
            outputColor = byteRound(outputColor);
          }
          gl_FragColor = vec4(srgbToLinear(outputColor), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const renderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      colorSpace: THREE.NoColorSpace,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const colorTarget = new THREE.WebGLRenderTarget(state.w, state.h, renderTargetOptions);
    const emissionTarget = new THREE.WebGLRenderTarget(state.w, state.h, renderTargetOptions);
    colorTarget.texture.colorSpace = THREE.NoColorSpace;
    emissionTarget.texture.colorSpace = THREE.NoColorSpace;
    colorTarget.texture.wrapS = THREE.RepeatWrapping;
    colorTarget.texture.wrapT = THREE.ClampToEdgeWrapping;
    emissionTarget.texture.wrapS = THREE.RepeatWrapping;
    emissionTarget.texture.wrapT = THREE.ClampToEdgeWrapping;

    state.uniforms = uniforms;
    state.compositorMaterial = material;
    state.compositorGeometry = geometry;
    state.compositorScene = scene;
    state.compositorCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    state.colorTarget = colorTarget;
    state.emissionTarget = emissionTarget;
  }

  function setSpecialBasisUniforms(state) {
    const uniforms = state.uniforms;
    uniforms.cityScoreMap.value = state.cityScoreTexture || state.blackTexture;
    uniforms.cityReady.value = state.cityScoreTexture ? 1 : 0;
    uniforms.nanoAttributesMap.value = state.nanoAttributesTexture || state.blackTexture;
    uniforms.nanoReady.value = state.nanoAttributesTexture ? 1 : 0;
  }

  function captureCityBasis(context, state, dustColor) {
    const saved = saveDynamicCoverage(context);
    clearDynamicCoverage(context);
    context.viz.coverage.ecumenopolis = 100;
    context.generateCraterTexture(0, dustColor);

    const scoreData = new Float32Array(state.w * state.h * 4);
    state.cityHistogram = { counts: new Uint32Array(256), total: 0 };
    for (let i = 0; i < state.w * state.h; i++) {
      const score = clamp01(context._ecumenopolisScore[i]);
      const offset = i * 4;
      scoreData[offset] = score;
      scoreData[offset + 1] = context._ecumenopolisShaderAttributes[offset];
      scoreData[offset + 2] = context._ecumenopolisShaderAttributes[offset + 1];
      scoreData[offset + 3] = context._ecumenopolisShaderAttributes[offset + 2];
      state.cityHistogram.counts[Math.max(0, Math.min(255, Math.floor(score * 255)))]++;
      state.cityHistogram.total++;
    }
    state.cityScoreTexture = createFloatTexture(scoreData, state.w, state.h);
    state.textures.push(state.cityScoreTexture);
    restoreDynamicCoverage(context, saved);
    setSpecialBasisUniforms(state);
  }

  function captureNanoBasis(context, state, dustColor) {
    const saved = saveDynamicCoverage(context);
    clearDynamicCoverage(context);
    context.viz.coverage.nanoworld = 100;
    context.generateCraterTexture(0, dustColor);
    state.nanoAttributesTexture = createFloatTexture(
      new Float32Array(context._nanoworldShaderAttributes),
      state.w,
      state.h
    );
    state.textures.push(state.nanoAttributesTexture);
    restoreDynamicCoverage(context, saved);
    setSpecialBasisUniforms(state);
  }

  function prepareSurfaceShaderBasis(context, state) {
    const saved = saveDynamicCoverage(context);
    const dustColor = context.normalizeHexColor(context.dustTintColor) || context.viz.baseColor;
    clearDynamicCoverage(context);
    context.generateCraterTexture(0, dustColor);
    state.baseWithoutCraters = createRawCanvasTexture(context, context._surfaceTextureCanvas);
    context.generateCraterTexture(1, dustColor);
    state.baseWithCraters = createRawCanvasTexture(context, context._surfaceTextureCanvas);
    state.textures.push(state.baseWithoutCraters, state.baseWithCraters);
    restoreDynamicCoverage(context, saved);

    buildCoreFields(context, state);
    buildLifeFields(context, state);
    state.blackTexture = createBlackTexture();
    state.textures.push(state.blackTexture);
    createCompositor(context, state);
    state.basisReady = true;
  }

  function buildSurfaceThresholds(context, state) {
    const waterCoverage = getCoverage(context, 'water');
    const iceCoverage = getCoverage(context, 'ice');
    const lifeCoverage = getCoverage(context, 'life');
    const hazardousCoverage = getCoverage(context, 'hazardousLife');
    const specialSurface = context.getDominionSurfaceVisualState();
    const waterThresholds = waterCoverage.map((coverage, zone) => (
      findAscendingThreshold(context.heightZoneHists[zone], coverage, false)
    ));
    const iceHistograms = createHistograms();
    const lifeHistograms = createHistograms();
    const iceActive = iceCoverage.some(value => value > 0);
    const lifeActive = lifeCoverage.some(value => value > 0)
      || hazardousCoverage.some(value => value > 0)
      || specialSurface.coverage.some(value => value > 0);
    if (lifeActive) buildLifeFields(context, state);
    const iceFromPoles = iceCoverage[2] > iceCoverage[0];

    if (iceActive || lifeActive) {
      for (let i = 0; i < state.w * state.h; i++) {
        const y = Math.floor(i / state.w);
        const zone = getZoneIndex(y, state.h);
        const offset = i * 4;
        const height = state.field0Data[offset];
        const waterThreshold = waterThresholds[zone];
        let water = 0;
        if (waterThreshold >= 0) {
          water = 1 - smoothstep(
            Math.max(0, waterThreshold - 0.06),
            Math.min(1, waterThreshold + 0.06),
            height
          );
        }

        if (iceActive) {
          const latitude = Math.min(1, Math.abs(y / Math.max(1, state.h - 1) - 0.5) * 2);
          const latitudeTerm = iceFromPoles ? 1 - latitude : latitude;
          const score = clamp01(
            Math.pow(Math.max(0, latitudeTerm), 0.85) * 0.58
            + state.field0Data[offset + 1] * 0.3
            + (1 - height) * 0.14
            - water * 0.05
          );
          const histogram = iceHistograms[zone];
          histogram.counts[Math.max(0, Math.min(255, Math.floor(score * 255)))]++;
          histogram.total++;
        }

        if (lifeActive) {
          const heightBin = Math.max(0, Math.min(255, Math.floor(height * 255)));
          const thresholdBin = waterThreshold >= 0 ? Math.round(waterThreshold * 255) : -1;
          if (thresholdBin >= 0 && heightBin <= thresholdBin) continue;
          const latitude = Math.min(1, Math.abs(y / Math.max(1, state.h - 1) - 0.5) * 2);
          const score = clamp01(
            state.field0Data[offset + 2] * 0.55
            + state.field0Data[offset + 3] * 0.25
            + (1 - latitude) * 0.1
            + (1 - height) * 0.05
            - water * 0.35
          );
          const histogram = lifeHistograms[zone];
          histogram.counts[Math.max(0, Math.min(255, Math.floor(score * 255)))]++;
          histogram.total++;
        }
      }
    }

    const uniforms = state.uniforms;
    uniforms.craterFactor.value = context.isStellarWorld()
      ? 0
      : clamp01(1 - context.computeTotalPressureKPa() / 100);
    setVector3(uniforms.waterCoverage.value, waterCoverage);
    setVector3(uniforms.waterThresholds.value, waterThresholds);
    setVector3(uniforms.iceCoverage.value, iceCoverage);
    setVector3(
      uniforms.iceThresholds.value,
      iceCoverage.map((coverage, zone) => findAscendingThreshold(iceHistograms[zone], coverage, true))
    );
    uniforms.iceFromPoles.value = iceFromPoles ? 1 : 0;
    setVector3(uniforms.lifeCoverage.value, lifeCoverage);
    setVector3(
      uniforms.lifeThresholds.value,
      lifeCoverage.map((coverage, zone) => findDescendingThreshold(lifeHistograms[zone], coverage))
    );
    const biomassPalette = getBiomassColorPalette(getActiveBiomassColor());
    setVector3(uniforms.lifePaletteBase.value, biomassPalette.base);
    setVector3(uniforms.lifePaletteLow.value, biomassPalette.low);
    setVector3(uniforms.lifePaletteHigh.value, biomassPalette.high);
    setVector3(uniforms.hazardousCoverage.value, hazardousCoverage);
    setVector3(
      uniforms.hazardousThresholds.value,
      hazardousCoverage.map((coverage, zone) => findDescendingThreshold(lifeHistograms[zone], coverage))
    );
    uniforms.specialSurfaceStyle.value = specialSurface.style;
    setVector3(
      uniforms.specialSurfaceThresholds.value,
      specialSurface.coverage.map((coverage, zone) => findDescendingThreshold(lifeHistograms[zone], coverage))
    );

    const cityStrength = context.getEcumenopolisVisualizerStrength();
    const nanoStrength = context.getNanoworldVisualizerStrength();
    if (cityStrength > 0 && !state.cityScoreTexture) {
      captureCityBasis(context, state, context.normalizeHexColor(context.dustTintColor) || context.viz.baseColor);
    }
    if (nanoStrength > 0 && !state.nanoAttributesTexture) {
      captureNanoBasis(context, state, context.normalizeHexColor(context.dustTintColor) || context.viz.baseColor);
    }
    uniforms.cityStrength.value = cityStrength;
    uniforms.nanoStrength.value = nanoStrength;
    if (cityStrength > 0 && state.cityHistogram) {
      uniforms.cityThreshold.value = findCityThreshold(state.cityHistogram, cityStrength);
      uniforms.citySoftness.value = Math.max(0.035, 0.11 - cityStrength * 0.06);
    }
  }

  function renderSurfaceShader(context, state) {
    buildSurfaceThresholds(context, state);
    const renderer = context.renderer;
    const cityStrength = context.getEcumenopolisVisualizerStrength();
    const nanoStrength = context.getNanoworldVisualizerStrength();
    const surface = context.surfaceMesh || context.sphere;
    const material = surface.material;

    const previousTarget = renderer.getRenderTarget();
    state.uniforms.outputEmission.value = 0;
    renderer.setRenderTarget(state.colorTarget);
    renderer.render(state.compositorScene, state.compositorCamera);

    const hasEmission = cityStrength > 0 || nanoStrength > 0;
    if (hasEmission) {
      state.uniforms.outputEmission.value = 1;
      renderer.setRenderTarget(state.emissionTarget);
      renderer.render(state.compositorScene, state.compositorCamera);
    }
    renderer.setRenderTarget(previousTarget);

    const mapChanged = material.map !== state.colorTarget.texture;
    const emissionMap = context.isStellarWorld()
      ? state.colorTarget.texture
      : (hasEmission ? state.emissionTarget.texture : null);
    const emissionChanged = material.emissiveMap !== emissionMap;
    material.map = state.colorTarget.texture;
    material.emissiveMap = emissionMap;
    if (mapChanged || emissionChanged) material.needsUpdate = true;
    context.updateSurfaceHeatMaterial();
    state.compositeCount++;
  }

  PlanetVisualizer.prototype.disposeSurfaceShaderResources = function disposeSurfaceShaderResources() {
    const state = this.surfaceShaderState;
    if (!state) return;
    for (const texture of state.textures) texture.dispose();
    if (state.colorTarget) state.colorTarget.dispose();
    if (state.emissionTarget) state.emissionTarget.dispose();
    if (state.compositorMaterial) state.compositorMaterial.dispose();
    if (state.compositorGeometry) state.compositorGeometry.dispose();
    this.surfaceShaderState = null;
  };

  PlanetVisualizer.prototype.updateSurfaceTextureFromPressure = function updateSurfaceTextureFromPressure(force = false) {
    if (
      this.isFlatWorld()
      || this.isSmbhShellWorld()
      || this.isEarthReconstructionVisualActive()
      || !canUseSurfaceShader(this)
    ) {
      const shaderWasActive = !!this.surfaceShaderState;
      if (shaderWasActive) this.disposeSurfaceShaderResources();
      cpuSurfaceUpdate.call(this, force || shaderWasActive);
      return;
    }

    if (this.debug.mode === 'game') {
      const gameBase = this.getGameBaseColor();
      if (gameBase !== this.viz.baseColor) {
        this.setBaseColor(gameBase, { fromGame: true, force: true, skipSurfaceUpdate: true });
      }
    }

    const staticKey = getSurfaceShaderStaticKey(this);
    const dynamicKey = getSurfaceShaderDynamicKey(this);
    let state = this.surfaceShaderState;
    if (!state || state.staticKey !== staticKey) {
      this.disposeSurfaceShaderResources();
      cpuSurfaceUpdate.call(this, true);
      const size = this.getSurfaceTextureSize();
      state = {
        w: size.w,
        h: size.h,
        staticKey,
        dynamicKey,
        basisReady: false,
        lifeFieldsReady: false,
        textures: [],
        compositeCount: 0,
      };
      this.surfaceShaderState = state;
      this._lastSurfaceShaderUpdate = -SURFACE_SHADER_UPDATE_INTERVAL_MS;
      return;
    }

    if (!force && dynamicKey === state.dynamicKey) return;
    const now = performance.now();
    if (
      !force
      && state.basisReady
      && now - this._lastSurfaceShaderUpdate < SURFACE_SHADER_UPDATE_INTERVAL_MS
    ) return;
    this._lastSurfaceShaderUpdate = now;

    if (!state.basisReady) prepareSurfaceShaderBasis(this, state);
    renderSurfaceShader(this, state);
    state.dynamicKey = dynamicKey;
  };

  PlanetVisualizer.prototype.resetSurfaceTextureThrottle = function resetSurfaceTextureThrottle() {
    cpuResetSurfaceThrottle.call(this);
    this._lastSurfaceShaderUpdate = -SURFACE_SHADER_UPDATE_INTERVAL_MS;
    if (this.surfaceShaderState) this.surfaceShaderState.dynamicKey = '';
  };
})();
