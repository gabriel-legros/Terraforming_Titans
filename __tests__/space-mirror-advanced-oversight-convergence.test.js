const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

const shouldRunSlowTest = process.env.RUN_SLOW_OVERSIGHT_TEST === '1';
const runIt = shouldRunSlowTest ? it : it.skip;

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.includes('phaser.min.js') || url.includes('three.min.js')) {
      return Promise.resolve(Buffer.from(''));
    }
    if (url.includes('/planet-visualizer/')) {
      if (url.endsWith('/planet-visualizer/core.js')) {
        return Promise.resolve(Buffer.from(
          'window.PlanetVisualizer = function PlanetVisualizer() {};\n' +
          'window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {};'
        ));
      }
      return Promise.resolve(Buffer.from(''));
    }
    return super.fetch(url, options);
  }
}

function setupWindow(window) {
  window.console.log = () => {};
  window.console.warn = () => {};

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
    dispatchEvent() { return false; },
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
    setTransform() {},
  });

  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};

  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        this.config = config;
        this.scene = {
          pause() {},
          resume() {},
        };
        const scene = config.scene || {};
        const preload = scene.preload || (() => {});
        const create = scene.create || (() => {});
        preload.call(window);
        window.setTimeout(() => create.call(window), 0);
      }
      destroy() {}
    },
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
      },
    };
  };

  Object.defineProperty(window, 'localStorage', {
    value: storageFactory(),
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: storageFactory(),
    configurable: true,
  });
}

function getGlobal(window, expression) {
  return window.eval(expression);
}

function installPlanetVisualizerStub(window) {
  const stub = {
    resetSurfaceTextureThrottle() {},
    updateSurfaceTextureFromPressure() {},
  };
  window.updateRender = () => {
    window.planetVisualizer = stub;
  };
  window.planetVisualizer = stub;
}

async function createGameDom() {
  const indexPath = path.resolve(__dirname, '..', 'index.html');
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${indexPath}`,
    beforeParse: setupWindow,
  });

  const { window } = dom;
  await (window.document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), 15000);
        window.addEventListener('load', () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      }));

  installPlanetVisualizerStub(window);
  return dom;
}

function loadSave(window, saveName) {
  installPlanetVisualizerStub(window);
  const savePath = path.resolve(__dirname, '..', 'test_saves', 'debug', saveName);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, true);
}

function computeOversightMetric(window) {
  const settings = getGlobal(window, 'mirrorOversightSettings');
  const terraforming = getGlobal(window, 'terraforming');
  const buildings = getGlobal(window, 'buildings');
  const zones = getGlobal(window, 'getZones()');

  terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });

  let tempError = 0;
  let maxTempError = 0;

  zones.forEach(zone => {
    const target = settings.targets?.[zone] || 0;
    if (!(target > 0)) {
      return;
    }
    const mode = settings.tempMode?.[zone] || 'average';
    const data = terraforming.temperature.zones[zone];
    const temp = mode === 'day'
      ? data.day
      : (mode === 'night' ? data.night : data.value);
    const err = Math.abs(temp - target);
    tempError += err;
    maxTempError = Math.max(maxTempError, err);
  });

  let waterError = 0;
  const waterTarget = settings.targets?.water || 0;
  if (waterTarget > 0) {
    const mirrors = Math.abs(settings.assignments?.mirrors?.focus || 0);
    const lanterns = settings.assignments?.lanterns?.focus || 0;
    const mirrorPowerPer = terraforming.calculateMirrorEffect().interceptedPower || 0;
    const lantern = buildings?.hyperionLantern;
    const lanternBase = Number.isFinite(lantern?._baseProductivity)
      ? lantern._baseProductivity
      : (Number.isFinite(lantern?.productivity) ? lantern.productivity : 1);
    const lanternPowerPer = lantern
      ? (lantern.powerPerBuilding || 0) * lanternBase
      : 0;
    const focusPower = mirrors * mirrorPowerPer + lanterns * lanternPowerPer;
    const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
    const energyPerKg = 2100 * deltaT + 334000;
    const melt = energyPerKg > 0
      ? Math.max(0, focusPower / energyPerKg / 1000) * 86400
      : 0;
    waterError = Math.abs(melt - waterTarget) / Math.max(1, waterTarget);
  }

  return { tempError, maxTempError, waterError };
}

function runAdvancedOversight(window, iterations) {
  const runAssignments = getGlobal(window, 'runAdvancedOversightAssignments');
  const projectManager = getGlobal(window, 'projectManager');
  const project = projectManager.projects.spaceMirrorFacility;
  for (let i = 0; i < iterations; i++) {
    runAssignments(project);
  }
}

function advanceGameTicks(window, tickCount, deltaMs) {
  for (let index = 0; index < tickCount; index += 1) {
    window.updateLogic(deltaMs);
    window.updateRender.lastDelta = deltaMs;
    window.updateRender(false, { forceAllSubtabs: false });
  }
}

const DEBUG_SAVES = [
  'oversight1.json',
  'oversight2.json',
  'oversight3.json',
];

const OVERSIGHT4_TICK_CASES = [
  { deltaMs: 100, ticks: 20 },
  { deltaMs: 1000, ticks: 20 },
];

describe('Space Mirror advanced oversight debug saves', () => {
  runIt.each(DEBUG_SAVES)('%s converges on zonal temperatures', async (saveName) => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, saveName);

      const settings = getGlobal(window, 'mirrorOversightSettings');
      expect(settings.advancedOversight).toBe(true);

      const before = computeOversightMetric(window);
      runAdvancedOversight(window, 10);
      const after = computeOversightMetric(window);

      expect(after.tempError).toBeLessThan(before.tempError);
      expect(after.tempError).toBeLessThan(Math.max(1, before.tempError * 0.01));
      expect(after.maxTempError).toBeLessThan(0.5);
      expect(Number.isFinite(after.waterError)).toBe(true);
      expect(after.waterError).toBeLessThan(1);
    } finally {
      dom.window.close();
    }
  }, 60000);

  runIt.each(OVERSIGHT4_TICK_CASES)(
    'oversight4 stays stable across $deltaMs ms live ticks',
    async ({ deltaMs, ticks }) => {
      const dom = await createGameDom();
      try {
        const { window } = dom;
        loadSave(window, 'oversight4.json');

        const settings = getGlobal(window, 'mirrorOversightSettings');
        expect(settings.advancedOversight).toBe(true);

        advanceGameTicks(window, ticks, deltaMs);
        const after = computeOversightMetric(window);
        const assignments = getGlobal(window, 'mirrorOversightSettings.assignments.mirrors');

        expect(after.tempError).toBeLessThan(0.2);
        expect(after.maxTempError).toBeLessThan(0.1);
        expect(assignments.tropical || 0).toBeGreaterThanOrEqual(0);
        expect(assignments.temperate || 0).toBeGreaterThanOrEqual(0);
        expect(assignments.polar || 0).toBeGreaterThanOrEqual(0);
      } finally {
        dom.window.close();
      }
    },
    60000
  );
});
