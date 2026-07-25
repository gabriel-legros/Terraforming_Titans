#!/usr/bin/env node

const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if ((url.includes('phaser') || url.includes('three')) && url.includes('.min.js')) {
      return Promise.resolve(Buffer.from(''));
    }
    if (url.includes('/planet-visualizer/')) {
      if (url.endsWith('/planet-visualizer/core.js')) {
        return Promise.resolve(Buffer.from(
          'window.PlanetVisualizer = function PlanetVisualizer() {};\n'
          + 'window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {};'
        ));
      }
      return Promise.resolve(Buffer.from(''));
    }
    return super.fetch(url, options);
  }
}

function parseArgs(argv) {
  const args = {
    seconds: 12,
    refinementIntervalMs: 500,
    refinementEveryChecks: 0,
    maxSteps: 0,
    greenhouseStrength: null,
    greenhouseExponent: null,
    condensationFactor: null,
    drySkewShape: null,
    cloudRefMix: null,
    cloudFractionMaximum: null,
    cloudPressureScale: null,
    cloudLayerMaximum: null,
    cloudCoverageExponent: null,
    cloudFractionExponent: null
  };
  const options = {
    '--seconds': 'seconds',
    '--refine-ms': 'refinementIntervalMs',
    '--refine-checks': 'refinementEveryChecks',
    '--steps': 'maxSteps',
    '--greenhouse': 'greenhouseStrength',
    '--greenhouse-exponent': 'greenhouseExponent',
    '--condensation': 'condensationFactor',
    '--shape': 'drySkewShape',
    '--cloud-ref-mix': 'cloudRefMix',
    '--cloud-cf-max': 'cloudFractionMaximum',
    '--cloud-p-scale': 'cloudPressureScale',
    '--cloud-layer-max': 'cloudLayerMaximum',
    '--cloud-coverage-exponent': 'cloudCoverageExponent',
    '--cloud-fraction-exponent': 'cloudFractionExponent'
  };

  for (let index = 2; index < argv.length; index += 1) {
    const key = options[argv[index]];
    if (!key || argv[index + 1] === undefined) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    args[key] = Number(argv[index + 1]);
    index += 1;
  }
  return args;
}

function setupBrowserStubs(window) {
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {},
    clearRect() {},
    getImageData() { return { data: [] }; },
    putImageData() {},
    createImageData() { return {}; },
    drawImage() {},
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    fillText() {},
    measureText() { return { width: 0 }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createPattern() { return {}; },
    setTransform() {}
  });
  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        this.scene = { pause() {}, resume() {} };
        const scene = config.scene || {};
        (scene.preload || (() => {})).call(window);
        window.setTimeout(() => (scene.create || (() => {})).call(window), 0);
      }
      destroy() {}
    }
  };
  window.Image = class {};
  window.structuredClone = (value) => JSON.parse(JSON.stringify(value));

  const storageFactory = () => {
    const store = new Map();
    return {
      get length() { return store.size; },
      clear() { store.clear(); },
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      key(index) { return Array.from(store.keys())[index] ?? null; },
      removeItem(key) { store.delete(key); },
      setItem(key, value) { store.set(String(key), String(value)); }
    };
  };
  Object.defineProperty(window, 'localStorage', {
    value: storageFactory(),
    configurable: true
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: storageFactory(),
    configurable: true
  });
}

async function loadGameDom(root) {
  const indexPath = path.resolve(root, 'index.html');
  const virtualConsole = new VirtualConsole();
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${indexPath}`,
    virtualConsole,
    beforeParse(window) {
      setupBrowserStubs(window);
    }
  });
  const { window } = dom;
  if (window.document.readyState !== 'complete') {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('Timed out waiting for window load')),
        20000
      );
      window.addEventListener('load', () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }
  return dom;
}

function resolveWorldStar(result) {
  const source = result.star || result.override.star || {};
  const celestial = result.override.celestialParameters || result.merged.celestialParameters || {};
  return {
    name: String(source.name || 'Star'),
    spectralType: String(source.spectralType || ''),
    luminositySolar: Number(source.luminositySolar ?? celestial.starLuminosity ?? 1),
    massSolar: Number(source.massSolar ?? 1),
    temperatureK: Number(source.temperatureK ?? 0),
    radiusSolar: Number(source.radiusSolar ?? 0),
    habitableZone: source.habitableZone || null
  };
}

function buildEquilibrationInput(window, result) {
  const input = window.deepMerge(window.defaultPlanetParameters, result.override || {});
  input.star = { ...(input.star || {}), ...resolveWorldStar(result) };
  input.celestialParameters.starLuminosity = input.star.luminositySolar;
  input.resources.special = input.resources.special || {};
  input.resources.special.albedoUpgrades =
    input.resources.special.albedoUpgrades || { initialValue: 0 };
  input.resources.special.whiteDust =
    input.resources.special.whiteDust || { initialValue: 0 };
  return input;
}

function summarizeClimate(window, override) {
  const atmosphere = override.resources.atmospheric;
  const totalAtmosphere = Object.values(atmosphere).reduce(
    (sum, entry) => sum + (entry.initialValue || 0),
    0
  );
  const composition = {
    co2: atmosphere.carbonDioxide.initialValue / totalAtmosphere,
    h2o: atmosphere.atmosphericWater.initialValue / totalAtmosphere,
    ch4: atmosphere.atmosphericMethane.initialValue / totalAtmosphere
  };
  const pressureBar = window.calculateAtmosphericPressure(
    totalAtmosphere,
    override.celestialParameters.gravity,
    override.celestialParameters.radius,
    override.celestialParameters.surfaceArea
  ) / 100000;
  const albedo = window.calculateActualAlbedoPhysics(
    override.celestialParameters.albedo,
    pressureBar,
    composition,
    override.celestialParameters.gravity,
    {}
  );
  return {
    pressureBar,
    actualAlbedo: albedo.albedo,
    cloudFraction: albedo.cfCloud,
    hazeFraction: albedo.cfHaze
  };
}

function applyParameters(window, args) {
  const parameters = window.terraformingParameters;
  const water = parameters.phaseChange.water;
  const humidity = parameters.phaseChange.statisticalHumidity;
  const greenhouse = parameters.climate.greenhouse.strength;
  const greenhouseExponent = parameters.climate.greenhouse.pressureExponentByGas;
  const clouds = parameters.climate.cloudSpecies.h2o;

  if (args.greenhouseStrength !== null) greenhouse.h2o = args.greenhouseStrength;
  if (args.greenhouseExponent !== null) {
    greenhouseExponent.h2o = args.greenhouseExponent;
  }
  if (args.condensationFactor !== null) {
    water.equilibriumCondensationParameter = args.condensationFactor;
    window.eval(
      `waterCycleInstance.equilibriumCondensationParameter = ${args.condensationFactor}`
    );
  }
  if (args.drySkewShape !== null) humidity.drySkewShape = args.drySkewShape;
  if (args.cloudRefMix !== null) clouds.refMix = args.cloudRefMix;
  if (args.cloudFractionMaximum !== null) clouds.cfMax = args.cloudFractionMaximum;
  if (args.cloudPressureScale !== null) clouds.pScale = args.cloudPressureScale;
  if (args.cloudLayerMaximum !== null) clouds.layerMax = args.cloudLayerMaximum;
  if (args.cloudCoverageExponent !== null) {
    clouds.coverageExponent = args.cloudCoverageExponent;
  }
  if (args.cloudFractionExponent !== null) {
    clouds.fractionExponent = args.cloudFractionExponent;
  }

  return {
    greenhouseStrength: greenhouse.h2o,
    greenhouseExponent: greenhouseExponent.h2o,
    condensationFactor: water.equilibriumCondensationParameter,
    drySkewShape: humidity.drySkewShape,
    cloud: { ...clouds }
  };
}

async function run() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const dom = await loadGameDom(root);
  const { window } = dom;
  try {
    window.eval(`
      if (!rwgManager) {
        rwgManager = new RwgManager();
      }
    `);
    window.buildings = window.buildings || {};
    window.buildings.dustFactory = window.buildings.dustFactory || {
      dustAlbedoTransitionActive: false,
      dustAlbedoStart: null
    };
    window.dustFactorySettings = window.dustFactorySettings || { dustColorAlbedo: 0.1 };

    const parameters = applyParameters(window, args);
    const world = window.generateRandomPlanet('EarthOverrun');
    const input = buildEquilibrationInput(window, world);
    const startedAt = Date.now();
    const result = await window.runEquilibration(input, {
      minRunMs: args.seconds * 1000,
      additionalRunMs: 0,
      timeoutMs: args.seconds * 1000,
      absTol: -1,
      relTol: -1,
      instabilityRefinementIntervalMs: args.refinementIntervalMs,
      instabilityRefinementEveryChecks: args.refinementEveryChecks,
      maxSteps: args.maxSteps
    });
    const diagnostics = result.diagnostics;
    const precipitationPerDay =
      diagnostics.ratesTonsPerDay.rainfall + diagnostics.ratesTonsPerDay.snowfall;

    process.stdout.write(JSON.stringify({
      parameters,
      elapsedMs: Date.now() - startedAt,
      steps: result.steps,
      climate: summarizeClimate(window, result.override),
      diagnostics: {
        ...diagnostics,
        precipitationTonsPerSecond: precipitationPerDay / 86400
      }
    }, null, 2) + '\n');
  } finally {
    window.close();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
