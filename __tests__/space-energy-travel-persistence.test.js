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

function getGlobal(window, expression) {
  return window.eval(expression);
}

async function waitFor(window, predicate, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise(resolve => window.setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for condition');
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
  await waitFor(window, () => getGlobal(window, 'typeof resources !== "undefined" && typeof projectManager !== "undefined" && typeof spaceManager !== "undefined"'));
  return dom;
}

function loadSave(window, relativePath) {
  installPlanetVisualizerStub(window);
  const savePath = path.resolve(__dirname, '..', relativePath);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, false);
}

describe('space energy travel persistence', () => {
  it('keeps stored space energy when traveling to another story planet', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    try {
      const antimatterProject = getGlobal(window, 'projectManager.projects.spaceAntimatter');
      const spaceEnergy = getGlobal(window, 'resources.space.energy');
      const batteryCount = 5;
      const expectedCap = batteryCount * 1e15;
      const expectedValue = 4.25e15;

      antimatterProject.unlocked = true;
      antimatterProject.isCompleted = true;
      antimatterProject.startedCompleted = true;
      antimatterProject.repeatCount = batteryCount;
      antimatterProject.applyBatteryStorageEffect();
      spaceEnergy.updateStorageCap();

      expect(spaceEnergy.cap).toBe(expectedCap);

      spaceEnergy.value = expectedValue;
      expect(spaceEnergy.value).toBe(expectedValue);
      expect(getGlobal(window, 'spaceManager.getCurrentPlanetKey()')).toBe('mars');

      window.selectPlanet('titan', true, true);

      await waitFor(window, () => getGlobal(window, 'spaceManager.getCurrentPlanetKey() === "titan"'));

      expect(getGlobal(window, 'projectManager.projects.spaceAntimatter.repeatCount')).toBe(batteryCount);
      expect(getGlobal(window, 'resources.space.energy.cap')).toBe(expectedCap);
      expect(getGlobal(window, 'resources.space.energy.value')).toBe(expectedValue);

      getGlobal(window, 'produceResources(1000, buildings)');

      expect(getGlobal(window, 'resources.space.energy.value')).toBe(expectedValue);
    } finally {
      dom.window.close();
    }
  }, 40000);

  it('preserves stored space energy when traveling away from a late-game debug save', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    try {
      loadSave(window, 'test_saves/debug/oversight2.json');
      installPlanetVisualizerStub(window);

      const beforeEnergy = getGlobal(window, 'resources.space.energy.value');
      const beforeCap = getGlobal(window, 'resources.space.energy.cap');
      const travelTarget = 'titan';
      expect(beforeEnergy).toBeGreaterThan(0);
      expect(beforeCap).toBeGreaterThan(0);

      getGlobal(window, 'spaceManager.planetStatuses.titan.terraformed = false');
      getGlobal(window, 'spaceManager.enablePlanet("titan")');

      window.selectPlanet(travelTarget, true, true);
      await waitFor(window, () => getGlobal(window, `spaceManager.getCurrentPlanetKey() === "${travelTarget}"`));

      expect(getGlobal(window, 'resources.space.energy.cap')).toBe(beforeCap);
      expect(getGlobal(window, 'resources.space.energy.value')).toBe(beforeEnergy);

      getGlobal(window, 'produceResources(1000, buildings)');
      expect(getGlobal(window, 'resources.space.energy.value')).toBe(beforeEnergy);
    } finally {
      dom.window.close();
    }
  }, 40000);
});
