const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

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
  window.initializePlanetVisualizerUI = () => {};
  const stub = {
    updateSurfaceTexture: () => {},
    updateSurfaceTextureFromPressure: () => {},
    updateZoneOverlays: () => {},
    updateLighting: () => {},
    updateClouds: () => {},
    updateAtmosphere: () => {},
    updateRings: () => {},
    updateWorldEffects: () => {},
    updateStructures: () => {},
    updateMirrorBeams: () => {},
    updateStarfield: () => {},
    updateBackground: () => {},
    resize: () => {},
    render: () => {},
    resetSurfaceTextureThrottle: () => {},
    setDebugMode: () => {},
  };
  window.updateRender = () => {
    window.planetVisualizer = stub;
  };
  window.planetVisualizer = stub;
  try {
    window.eval('planetVisualizer = window.planetVisualizer;');
  } catch (error) {}
}

async function createGameDom() {
  const htmlPath = path.resolve(__dirname, '..', 'index.html');
  const dom = await JSDOM.fromFile(htmlPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${htmlPath}`,
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
  const savePath = path.resolve(__dirname, '..', 'test_saves', 'player_saves', saveName);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, true);
}

describe('furnace expansion tooltip save repro', () => {
  it('keeps actual furnace expansion consumption after load and tick', async () => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, 'furnace_expansion_tooltip_bug.json');

      const resources = getGlobal(window, 'resources');
      const projectManager = getGlobal(window, 'projectManager');
      const furnace = projectManager.projects.nuclearAlchemyFurnace;

      expect(furnace.isActive).toBe(true);
      expect(furnace.autoStart).toBe(true);
      expect(furnace.isExpansionContinuous()).toBe(false);

      const beforeActual = resources.colony.components.consumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;
      const beforeProjected = resources.colony.components.projectedConsumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;

      window.eval('updateLogic(1000)');
      const afterActual = resources.colony.components.consumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;
      const afterProjected = resources.colony.components.projectedConsumptionRateBySource['Nuclear Alchemical Furnace expansion'] || 0;

      expect(beforeProjected).toBeGreaterThan(0);
      expect(afterProjected).toBeGreaterThan(0);
      expect(beforeActual).toBe(0);
      expect(afterActual).toBeGreaterThan(0);
      expect(afterActual).toBeCloseTo(afterProjected, 6);
    } finally {
      dom.window.close();
    }
  }, 60000);
});
