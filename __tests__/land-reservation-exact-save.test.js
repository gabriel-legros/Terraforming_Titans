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

  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};

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
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createPattern() { return {}; },
    setTransform() {},
  });

  window.Phaser = {
    AUTO: 'AUTO',
    Game: class {
      constructor(config = {}) {
        const scene = config.scene || {};
        const preload = scene.preload || (() => {});
        const create = scene.create || (() => {});
        preload.call(window);
        window.setTimeout(() => create.call(window), 0);
      }
      destroy() {}
    },
  };

  window.initializePlanetVisualizerUI = () => {};
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

  const stub = {
    updateSurfaceTexture() {},
    updateSurfaceTextureFromPressure() {},
    updateZoneOverlays() {},
    updateLighting() {},
    updateClouds() {},
    updateAtmosphere() {},
    updateRings() {},
    updateWorldEffects() {},
    updateStructures() {},
    updateMirrorBeams() {},
    updateStarfield() {},
    updateBackground() {},
    resize() {},
    render() {},
    resetSurfaceTextureThrottle() {},
    setDebugMode() {},
  };
  window.updateRender = () => {
    window.planetVisualizer = stub;
  };
  window.planetVisualizer = stub;
  window.eval('planetVisualizer = window.planetVisualizer;');

  return dom;
}

function loadSave(window, saveName) {
  const savePath = path.resolve(__dirname, '..', 'test_saves', 'player_saves', saveName);
  const saveText = fs.readFileSync(savePath, 'utf8');
  window.loadGame(saveText, true);
}

describe('exact land reservations', () => {
  it('uses exact land when building ecumenopolis districts from a save', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    loadSave(window, 'land_bug.json');

    const before = window.eval(`({
      available: resources.surface.land.getExactLandAvailable().toString(),
      reserved: resources.surface.land.getExactReservedAmountForSource('building:t7_colony').toString(),
      count: colonies.t7_colony.count,
      active: colonies.t7_colony.active
    })`);

    const result = window.eval('colonies.t7_colony.build(10000000000, true)');

    const after = window.eval(`({
      available: resources.surface.land.getExactLandAvailable().toString(),
      reserved: resources.surface.land.getExactReservedAmountForSource('building:t7_colony').toString(),
      count: colonies.t7_colony.count,
      active: colonies.t7_colony.active
    })`);

    expect(result).toBe(true);
    expect(before.available).toBe('1000000000000000000000000000000');
    expect(after.available).toBe('0');
    expect(after.reserved).toBe('22000000000000000000000000000000');
    expect(after.count).toBe(before.count + 10000000000);
    expect(after.active).toBe(before.active + 10000000000);

    dom.window.close();
  });

  it('uses exact land when activating saved inactive ecumenopolis districts', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    loadSave(window, 'land_bug.json');

    const before = window.eval(`({
      available: resources.surface.land.getExactLandAvailable().toString(),
      reserved: resources.surface.land.getExactReservedAmountForSource('building:t7_colony').toString(),
      active: colonies.t7_colony.active
    })`);

    window.eval('adjustStructureActivation(colonies.t7_colony, 10000000000)');

    const after = window.eval(`({
      available: resources.surface.land.getExactLandAvailable().toString(),
      reserved: resources.surface.land.getExactReservedAmountForSource('building:t7_colony').toString(),
      active: colonies.t7_colony.active
    })`);

    expect(after.available).toBe('0');
    expect(after.reserved).toBe('22000000000000000000000000000000');
    expect(after.active).toBe(before.active + 10000000000);

    dom.window.close();
  });

  it('rebuilds stale base land from geometry so pulsar still leaves underground expansion land available', async () => {
    const dom = await createGameDom();
    const { window } = dom;

    loadSave(window, 'wolfy_no_expansion_land.json');

    const result = window.eval(`(() => {
      const land = resources.surface.land;
      const project = projectManager.projects.undergroundExpansion;
      const pulsar = hazardManager.parameters.pulsar;
      return {
        baseLand: terraforming.baseLand,
        geometricLand: resolveWorldGeometricLand(terraforming, land),
        totalLand: land.value,
        reservedLand: land.reserved,
        availableLand: land.getAvailableAmount(),
        expansionProgress: project.getTotalProgress(),
        pulsarStrength: hazardManager.pulsarHazard.getHazardStrength(terraforming, pulsar)
      };
    })()`);

    expect(result.pulsarStrength).toBeCloseTo(1, 10);
    expect(result.baseLand).toBeCloseTo(result.geometricLand, 6);
    expect(result.reservedLand).toBeCloseTo(result.baseLand, 6);
    expect(result.totalLand).toBeCloseTo(result.geometricLand + result.expansionProgress, 6);
    expect(result.availableLand).toBeCloseTo(result.expansionProgress, 6);

    dom.window.close();
  });
});
