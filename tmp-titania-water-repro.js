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

async function main() {
  const indexPath = path.resolve(__dirname, 'index.html');
  const dom = await JSDOM.fromFile(indexPath, {
    runScripts: 'dangerously',
    resources: new GameResourceLoader(),
    pretendToBeVisual: true,
    url: `file://${indexPath}`,
    beforeParse(window) {
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
        createLinearGradient() { return { addColorStop() {} }; },
        createPattern() { return {}; },
        setTransform() {},
      });
      window.Phaser = {
        AUTO: 'AUTO',
        Game: class {
          constructor(config = {}) {
            this.config = config;
            this.scene = { pause() {}, resume() {} };
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
          get length() { return store.size; },
          clear() { store.clear(); },
          getItem(key) { return store.has(key) ? store.get(key) : null; },
          key(index) { return Array.from(store.keys())[index] ?? null; },
          removeItem(key) { store.delete(key); },
          setItem(key, value) { store.set(String(key), String(value)); },
        };
      };
      Object.defineProperty(window, 'localStorage', { value: storageFactory(), configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: storageFactory(), configurable: true });
    },
  });

  const { window } = dom;
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (window.spaceManager && window.buildSpecialSeedWorldResult) {
        resolve();
        return;
      }
      if (Date.now() - started > 15000) {
        reject(new Error('Timed out waiting for game initialization'));
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });

  window.spaceManager.setRwgLock('mars', true);
  const result = window.buildSpecialSeedWorldResult('Titania', 0);
  window.spaceManager.travelToRandomWorld(result, result.seedString || 'Titania');

  const snapshot = (label) => {
    console.log(label, JSON.stringify({
      atmosphericWaterCurrent: window.resources?.atmospheric?.atmosphericWater?.value,
      atmosphericWaterInitial: window.currentPlanetParameters?.resources?.atmospheric?.atmosphericWater?.initialValue,
      totalPressureKPa: window.terraforming?.calculateTotalPressure?.(),
      gravity: window.terraforming?.celestialParameters?.gravity,
      radius: window.terraforming?.celestialParameters?.radius,
      temperature: window.terraforming?.temperature?.value,
      zonalTemps: window.terraforming?.temperature?.zones,
      totalWaterSublimationRate: window.terraforming?.totalWaterSublimationRate,
      totalEvaporationRate: window.terraforming?.totalEvaporationRate,
    }));
  };

  snapshot('AFTER_TRAVEL');
  window.updateLogic(100);
  snapshot('AFTER_100MS');
  window.updateLogic(1000);
  snapshot('AFTER_1100MS');
  dom.window.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
