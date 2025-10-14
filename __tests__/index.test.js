const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

class GameResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.includes('phaser.min.js') || url.includes('three.min.js')) {
      return Promise.resolve(Buffer.from(''));
    }
    if (url.includes('/planet-visualizer/')) {
      if (url.endsWith('/planet-visualizer/core.js')) {
        const stub = [
          'window.PlanetVisualizer = function PlanetVisualizer() {};',
          'window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI() {};'
        ].join('\n');
        return Promise.resolve(Buffer.from(stub));
      }
      return Promise.resolve(Buffer.from(''));
    }
    return super.fetch(url, options);
  }
}

describe('index.html', () => {
  jest.setTimeout(30000);

  it('loads without runtime or console errors', async () => {
    const consoleMessages = [];
    const runtimeErrors = [];

    const virtualConsole = new VirtualConsole();
    virtualConsole.on('error', (error) => {
      runtimeErrors.push(error);
    });
    virtualConsole.on('jsdomError', (error) => {
      runtimeErrors.push(error);
    });

    const indexPath = path.resolve(__dirname, '..', 'index.html');

    const dom = await JSDOM.fromFile(indexPath, {
      runScripts: 'dangerously',
      resources: new GameResourceLoader(),
      pretendToBeVisual: true,
      url: `file://${indexPath}`,
      virtualConsole,
      beforeParse(window) {
        const originalConsoleError = window.console.error.bind(window.console);
        window.console.error = (...args) => {
          const message = args.map((value) => String(value)).join(' ');
          consoleMessages.push(message);
          originalConsoleError(...args);
        };

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
      },
    });

    const { window } = dom;
    window.addEventListener('error', (event) => {
      runtimeErrors.push(event.error || event.message || new Error('Unknown error event'));
    });
    window.addEventListener('unhandledrejection', (event) => {
      runtimeErrors.push(event.reason || new Error('Unhandled promise rejection'));
    });

    const loadPromise = window.document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), 15000);
          window.addEventListener('load', () => {
            window.clearTimeout(timer);
            resolve();
          }, { once: true });
        });

    await loadPromise;
    await new Promise((resolve) => window.setTimeout(resolve, 100));

    dom.window.close();

    if (runtimeErrors.length > 0 || consoleMessages.length > 0) {
      const parts = [];
      if (runtimeErrors.length > 0) {
        parts.push(`Runtime errors: ${runtimeErrors.map((error) => error && error.stack ? error.stack : String(error)).join('\n')}`);
      }
      if (consoleMessages.length > 0) {
        parts.push(`Console errors: ${consoleMessages.join('\n')}`);
      }
      throw new Error(parts.join('\n\n'));
    }
  });
});
