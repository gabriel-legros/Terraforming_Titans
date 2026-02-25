const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

const shouldRunTempTest = process.env.RUN_TEMP_EQ_TEST === '1';
const runIt = shouldRunTempTest ? it : it.skip;

const SEED = process.env.TEMP_EQ_SEED || '1982065114|planet|icy-moon|hz-mid';
const FULL_TIMER_MS = 90_000;

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.includes('phaser.min.js') || url.includes('three.min.js')) {
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

  const canvasProto = window.HTMLCanvasElement.prototype;
  canvasProto.getContext = () => ({
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
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createPattern() { return {}; },
    setTransform() {}
  });

  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        this.config = config;
        this.scene = {
          pause() {},
          resume() {}
        };
        const scene = config.scene || {};
        const preload = scene.preload || (() => {});
        const create = scene.create || (() => {});
        preload.call(window);
        window.setTimeout(() => create.call(window), 0);
      }
      destroy() {}
    }
  };

  window.initializePlanetVisualizerUI = window.initializePlanetVisualizerUI || (() => {});
  window.Image = class {};
  window.structuredClone = (value) => JSON.parse(JSON.stringify(value));

  const storageFactory = () => {
    const store = new Map();
    return {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      key(index) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key) {
        store.delete(key);
      },
      setItem(key, value) {
        store.set(String(key), String(value));
      }
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

async function loadGameDom() {
  const indexPath = path.resolve(__dirname, '..', 'index.html');
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${indexPath}`,
    beforeParse(window) {
      setupBrowserStubs(window);
    }
  });

  const { window } = dom;
  await (window.document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), 20_000);
        window.addEventListener('load', () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      }));

  return dom;
}

function getResourceValue(override, category, key) {
  const entry = override
    && override.resources
    && override.resources[category]
    && override.resources[category][key];
  if (!entry) {
    return 0;
  }
  const value = Number.isFinite(entry.initialValue) ? entry.initialValue : entry.value;
  return Number.isFinite(value) ? value : 0;
}

function getTotalWater(override) {
  return getResourceValue(override, 'surface', 'ice')
    + getResourceValue(override, 'surface', 'liquidWater')
    + getResourceValue(override, 'atmospheric', 'atmosphericWater');
}

function resolveWorldStar(res) {
  const source = (res && res.star) || ((res && res.override) ? res.override.star : null) || {};
  const mergedCelestial = (res && res.merged && res.merged.celestialParameters) || {};
  const overrideCelestial = (res && res.override && res.override.celestialParameters) || {};
  const celestialLum = overrideCelestial.starLuminosity ?? mergedCelestial.starLuminosity;
  return {
    name: String(source.name || 'Star'),
    spectralType: String(source.spectralType || ''),
    luminositySolar: Number(source.luminositySolar ?? celestialLum ?? 1),
    massSolar: Number(source.massSolar ?? 1),
    temperatureK: Number(source.temperatureK ?? 0),
    radiusSolar: Number(source.radiusSolar ?? 0),
    habitableZone: source.habitableZone || null
  };
}

function buildEquilibrationInputParams(window, res) {
  const base = window.deepMerge(window.defaultPlanetParameters, res?.override || {});
  const star = resolveWorldStar(res);
  base.star = {
    ...(base.star || {}),
    ...star
  };
  base.celestialParameters = base.celestialParameters || {};
  base.celestialParameters.starLuminosity = star.luminositySolar;
  base.resources = base.resources || {};
  base.resources.special = base.resources.special || {};
  base.resources.special.albedoUpgrades = base.resources.special.albedoUpgrades || { initialValue: 0 };
  base.resources.special.whiteDust = base.resources.special.whiteDust || { initialValue: 0 };
  return base;
}

describe('TEMP RWG equilibration water totals', () => {
  jest.setTimeout(240_000);

  runIt('captures initial/final total water for 1982065114|planet|icy-moon|hz-mid using full timer', async () => {
    const dom = await loadGameDom();
    const { window } = dom;

    try {
      window.eval(`
        if (typeof rwgManager === 'undefined' || !rwgManager) {
          rwgManager = new RwgManager();
        }
      `);
      window.buildings = window.buildings || {};
      window.buildings.dustFactory = window.buildings.dustFactory || {
        dustAlbedoTransitionActive: false,
        dustAlbedoStart: null
      };
      window.dustFactorySettings = window.dustFactorySettings || { dustColorAlbedo: 0.1 };

      const res = window.generateRandomPlanet(SEED);
      const eqInput = buildEquilibrationInputParams(window, res);
      const initialTotalWater = getTotalWater(eqInput);

      const startedAt = Date.now();
      const result = await window.runEquilibration(eqInput, {
        minRunMs: 30_000,
        additionalRunMs: 60_000,
        timeoutMs: FULL_TIMER_MS,
        absTol: -1,
        relTol: -1
      });
      const elapsedMs = Date.now() - startedAt;
      const finalTotalWater = getTotalWater(result.override);

      console.log(
        `[TEMP_EQ_WATER] seed=${SEED} initialTotalWater=${initialTotalWater} finalTotalWater=${finalTotalWater} elapsedMs=${elapsedMs}`
      );

      expect(Number.isFinite(initialTotalWater)).toBe(true);
      expect(Number.isFinite(finalTotalWater)).toBe(true);
      expect(elapsedMs).toBeGreaterThanOrEqual(FULL_TIMER_MS - 1_000);
    } finally {
      dom.window.close();
    }
  });
});
