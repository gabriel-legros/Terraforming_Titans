#!/usr/bin/env node

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
          'window.initializePlanetVisualizerUI = function initializePlanetVisualizerUI(){\n' +
          '  window.planetVisualizer = {\n' +
          '    resetSurfaceTextureThrottle: function(){},\n' +
          '    updateSurfaceTextureFromPressure: function(){},\n' +
          '    onResize: function(){},\n' +
          '    setBaseColor: function(){},\n' +
          '    setDebugMode: function(){},\n' +
          '    viz: { coverage: {} },\n' +
          '    debug: {}\n' +
          '  };\n' +
          '};\n'
        ));
      }
      return Promise.resolve(Buffer.from(''));
    }

    return super.fetch(url, options);
  }
}

function parseArgs(argv) {
  const args = {
    save: 'test_saves/player_saves/unstable_water_cycle.json',
    ticks: 10,
    minDelta: 15,
    maxDelta: 25,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--save' && next) {
      args.save = next;
      i += 1;
      continue;
    }
    if (token === '--ticks' && next) {
      args.ticks = Math.max(1, Number(next));
      i += 1;
      continue;
    }
    if (token === '--min-delta' && next) {
      args.minDelta = Number(next);
      i += 1;
      continue;
    }
    if (token === '--max-delta' && next) {
      args.maxDelta = Number(next);
      i += 1;
      continue;
    }
  }

  if (!Number.isFinite(args.ticks) || args.ticks < 1) {
    throw new Error('Invalid --ticks value');
  }
  if (!Number.isFinite(args.minDelta) || !Number.isFinite(args.maxDelta) || args.minDelta > args.maxDelta) {
    throw new Error('Invalid --min-delta/--max-delta range');
  }

  args.ticks = Math.floor(args.ticks);
  args.minDelta = Math.floor(args.minDelta);
  args.maxDelta = Math.floor(args.maxDelta);

  return args;
}

function randomIntInclusive(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function waitForLoad(window, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (window.document.readyState === 'complete') {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => reject(new Error('Timed out waiting for window load')), timeoutMs);
    window.addEventListener('load', () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function run() {
  const args = parseArgs(process.argv);
  const root = process.cwd();
  const indexPath = path.resolve(root, 'index.html');
  const savePath = path.resolve(root, args.save);
  const saveData = fs.readFileSync(savePath, 'utf8');

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

      if (window.HTMLMediaElement && window.HTMLMediaElement.prototype) {
        window.HTMLMediaElement.prototype.play = () => Promise.resolve();
        window.HTMLMediaElement.prototype.pause = () => {};
      }

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
            return Array.from(store.keys())[index] || null;
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

      // Keep manual runs readable by hiding noisy game logs.
      window.console.log = () => {};
      window.console.info = () => {};
      window.console.warn = () => {};
      window.console.debug = () => {};
      window.console.error = () => {};
    },
  });

  const { window } = dom;
  try {
    await waitForLoad(window, 30000);
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    window.loadGame(saveData);
    await new Promise((resolve) => window.setTimeout(resolve, 50));

    // Use the live terraforming instance. window.terraformingManager can be stale
    // after initializeGameState() replaces the global terraforming variable.
    const terraforming = window.eval('terraforming') || window.terraforming || window.terraformingManager;
    if (!terraforming || typeof terraforming.updateResources !== 'function') {
      throw new Error('Active terraforming instance/updateResources is unavailable after loading save');
    }

    const sumZonalLiquidWater = () => {
      if (!terraforming.zonalSurface) return 0;
      let total = 0;
      for (const zoneName in terraforming.zonalSurface) {
        total += Number(terraforming.zonalSurface[zoneName].liquidWater || 0);
      }
      return total;
    };

    const makePoint = (tick, deltaMs, previousAtmosphericWater) => {
      const atmosphericWater = Number(terraforming.resources.atmospheric.atmosphericWater.value);
      const liquidWater = Number(terraforming.resources.surface.liquidWater.value);
      const zonalLiquidWater = sumZonalLiquidWater();
      const evaporationRate = Number(terraforming.totalEvaporationRate || 0);
      const boilingRate = Number(terraforming.totalBoilingRate || 0);
      const rainfallRate = Number(terraforming.totalRainfallRate || 0);
      const deltaDays = deltaMs / 1000;

      return {
        tick,
        deltaMs,
        atmosphericWater,
        atmosphericWaterDelta: previousAtmosphericWater == null ? 0 : atmosphericWater - previousAtmosphericWater,
        liquidWater,
        zonalLiquidWater,
        evaporationRate,
        boilingRate,
        rainfallRate,
        evaporationAmount: evaporationRate * deltaDays,
        boilingAmount: boilingRate * deltaDays,
        rainfallAmount: rainfallRate * deltaDays,
      };
    };

    const points = [];
    points.push(makePoint(0, 0, null));

    for (let tick = 1; tick <= args.ticks; tick++) {
      const deltaMs = randomIntInclusive(args.minDelta, args.maxDelta);
      const previousAtmosphericWater = Number(terraforming.resources.atmospheric.atmosphericWater.value);
      terraforming.updateResources(deltaMs);
      points.push(makePoint(tick, deltaMs, previousAtmosphericWater));
    }

    process.stdout.write(JSON.stringify({
      save: path.relative(root, savePath),
      ticks: args.ticks,
      minDeltaMs: args.minDelta,
      maxDeltaMs: args.maxDelta,
      points,
    }, null, 2) + '\n');
  } finally {
    window.close();
  }
}

run().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
