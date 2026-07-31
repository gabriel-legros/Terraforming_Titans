#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function printHelp() {
  console.log([
    'Usage: node scripts/manual-tests/benchmark-world-visualizer.js [options]',
    '',
    'Options:',
    '  --save <path>          Save JSON to load',
    '  --planet <key>         Planet debug preset. Default: mars when no save is provided',
    '  --duration <seconds>   Measurement duration. Default: 15',
    '  --sample <milliseconds> Timeline sample interval. Default: 1000',
    '  --channel <name>       Playwright browser channel. Default: bundled',
    '  --headed              Show the browser while benchmarking',
    '  --help                Show this help',
  ].join('\n'));
}

function parseNumber(value, flag, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${flag} must be between ${minimum} and ${maximum}`);
  }
  return number;
}

function parseArgs(argv) {
  const options = {
    save: null,
    planet: null,
    durationSeconds: 15,
    sampleMs: 1000,
    channel: 'bundled',
    headed: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--headed') {
      options.headed = true;
      continue;
    }
    if (!next || next.startsWith('--')) {
      throw new Error(`${arg} requires a value`);
    }
    if (arg === '--save') options.save = path.resolve(next);
    else if (arg === '--planet') options.planet = next;
    else if (arg === '--duration') options.durationSeconds = parseNumber(next, arg, 1, 3600);
    else if (arg === '--sample') options.sampleMs = Math.round(parseNumber(next, arg, 50, 60000));
    else if (arg === '--channel') options.channel = next;
    else throw new Error(`Unknown argument: ${arg}`);
    index++;
  }

  if (options.save && options.planet) {
    throw new Error('--save cannot be combined with --planet');
  }
  if (options.save && (!fs.existsSync(options.save) || !fs.statSync(options.save).isFile())) {
    throw new Error(`Save file not found: ${options.save}`);
  }
  if (!options.save) {
    options.planet = options.planet || 'mars';
  }
  return options;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.js') return 'text/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.wav') return 'audio/wav';
  if (extension === '.mp3') return 'audio/mpeg';
  return 'application/octet-stream';
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const filePath = path.resolve(repoRoot, relativePath);

    if (!filePath.startsWith(repoRoot + path.sep) && filePath !== repoRoot) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      response.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        origin: `http://127.0.0.1:${server.address().port}`,
      });
    });
  });
}

async function installCanvasProbe(page) {
  await page.addInitScript(() => {
    const originalCreateElement = Document.prototype.createElement;
    let canvasCreateCount = 0;
    Document.prototype.createElement = function (name, options) {
      const element = originalCreateElement.call(this, name, options);
      if (String(name).toLowerCase() === 'canvas') {
        canvasCreateCount++;
      }
      return element;
    };
    window.worldVisualizerCanvasCreateCount = () => canvasCreateCount;
  });
}

async function installVisualizerProbe(page) {
  await page.evaluate(() => {
    const counterNames = [
      'frameCalls',
      'generateCraterTextureCalls',
      'updateCloudMeshTextureCalls',
      'surfaceUpdateCalls',
    ];
    const timingNames = [
      'frameInterval',
      'frameDuration',
      'generateCraterTexture',
      'updateCloudMeshTexture',
      'surfaceUpdate',
    ];
    const counters = {};
    const intervalTimings = {};
    const measurementTimings = {};
    counterNames.forEach(name => {
      counters[name] = 0;
    });
    timingNames.forEach(name => {
      intervalTimings[name] = [];
      measurementTimings[name] = [];
    });

    const state = {
      counters,
      intervalTimings,
      measurementTimings,
      lastFrameAt: null,
      measurementStartedAt: null,
      measurementBaseline: null,
      measuring: false,
    };

    const round = value => Number(value.toFixed(3));
    const summarize = values => {
      if (!values.length) {
        return {
          count: 0,
          totalMs: 0,
          meanMs: 0,
          p50Ms: 0,
          p95Ms: 0,
          p99Ms: 0,
          maxMs: 0,
        };
      }
      const sorted = values.slice().sort((a, b) => a - b);
      const percentile = fraction => sorted[Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * fraction) - 1)
      )];
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        count: values.length,
        totalMs: round(total),
        meanMs: round(total / values.length),
        p50Ms: round(percentile(0.5)),
        p95Ms: round(percentile(0.95)),
        p99Ms: round(percentile(0.99)),
        maxMs: round(sorted[sorted.length - 1]),
      };
    };

    const recordTiming = (name, duration) => {
      intervalTimings[name].push(duration);
      if (state.measuring) {
        measurementTimings[name].push(duration);
      }
    };

    const wrapTimedMethod = (target, name, counterName, timingName) => {
      const original = target[name];
      if (!original) {
        throw new Error(`Visualizer method is missing: ${name}`);
      }
      target[name] = function (...args) {
        counters[counterName]++;
        const startedAt = performance.now();
        try {
          return original.apply(this, args);
        } finally {
          recordTiming(timingName, performance.now() - startedAt);
        }
      };
    };

    const prototype = PlanetVisualizer.prototype;
    wrapTimedMethod(
      prototype,
      'generateCraterTexture',
      'generateCraterTextureCalls',
      'generateCraterTexture'
    );
    wrapTimedMethod(
      prototype,
      'updateCloudMeshTexture',
      'updateCloudMeshTextureCalls',
      'updateCloudMeshTexture'
    );
    wrapTimedMethod(
      prototype,
      'updateSurfaceTextureFromPressure',
      'surfaceUpdateCalls',
      'surfaceUpdate'
    );

    const attachVisualizer = () => {
      const visualizer = window.planetVisualizer;
      if (!visualizer || visualizer.worldVisualizerBenchmarkWrapped) return;
      const originalAnimate = visualizer.animate;
      visualizer.animate = function (...args) {
        const startedAt = performance.now();
        if (state.lastFrameAt !== null) {
          recordTiming('frameInterval', startedAt - state.lastFrameAt);
        }
        state.lastFrameAt = startedAt;
        counters.frameCalls++;
        try {
          return originalAnimate.apply(this, args);
        } finally {
          recordTiming('frameDuration', performance.now() - startedAt);
        }
      };
      visualizer.worldVisualizerBenchmarkWrapped = true;
    };

    const getShaderState = () => {
      const shader = window.planetVisualizer?.surfaceShaderState;
      return {
        present: !!shader,
        basisReady: !!shader?.basisReady,
        compositeCount: shader?.compositeCount || 0,
      };
    };

    const getRendererState = () => {
      const renderer = window.planetVisualizer?.renderer;
      const info = renderer?.info;
      return {
        textures: info?.memory?.textures || 0,
        geometries: info?.memory?.geometries || 0,
        programs: info?.programs?.length || 0,
        drawCalls: info?.render?.calls || 0,
        triangles: info?.render?.triangles || 0,
        lines: info?.render?.lines || 0,
        points: info?.render?.points || 0,
      };
    };

    const getCumulativeState = () => ({
      canvasCreates: window.worldVisualizerCanvasCreateCount(),
      counters: { ...counters },
      shader: getShaderState(),
      renderer: getRendererState(),
    });

    const sample = resetInterval => {
      attachVisualizer();
      const timing = {};
      timingNames.forEach(name => {
        timing[name] = summarize(intervalTimings[name]);
        if (resetInterval) intervalTimings[name].length = 0;
      });
      return {
        elapsedMs: state.measurementStartedAt === null
          ? 0
          : round(performance.now() - state.measurementStartedAt),
        ...getCumulativeState(),
        timing,
      };
    };

    const beginMeasurement = () => {
      attachVisualizer();
      timingNames.forEach(name => {
        intervalTimings[name].length = 0;
        measurementTimings[name].length = 0;
      });
      state.measurementBaseline = getCumulativeState();
      state.measurementStartedAt = performance.now();
      state.lastFrameAt = state.measurementStartedAt;
      state.measuring = true;
    };

    const finishMeasurement = () => {
      state.measuring = false;
      const end = getCumulativeState();
      const start = state.measurementBaseline;
      const timing = {};
      timingNames.forEach(name => {
        timing[name] = summarize(measurementTimings[name]);
      });
      const counterDeltas = {};
      counterNames.forEach(name => {
        counterDeltas[name] = end.counters[name] - start.counters[name];
      });
      return {
        elapsedMs: round(performance.now() - state.measurementStartedAt),
        canvasCreates: end.canvasCreates - start.canvasCreates,
        counters: counterDeltas,
        timing,
        shader: {
          start: start.shader,
          end: end.shader,
          compositeDelta: end.shader.compositeCount - start.shader.compositeCount,
        },
        renderer: {
          start: start.renderer,
          end: end.renderer,
        },
      };
    };

    window.worldVisualizerBenchmarkProbe = {
      attachVisualizer,
      beginMeasurement,
      finishMeasurement,
      sample,
    };
    attachVisualizer();
  });
}

async function configureScene(page, options, saveText) {
  return page.evaluate(({ planet, save }) => {
    if (save) {
      const loaded = loadGame(save, true, { skipRender: true });
      if (!loaded) throw new Error('Unable to load save JSON');
      updateRender.lastDelta = 0;
      updateRender(true, { forceAllSubtabs: true });
    }

    openTerraformingWorldTab();
    hideLoadingOverlay();
    document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay')
      .forEach(overlay => overlay.remove());
    window.popupActive = false;
    setAutosaveIntervalSeconds(0);

    const visualizer = window.planetVisualizer;
    if (!visualizer?.renderer) throw new Error('Planet visualizer did not initialize');

    if (planet) {
      if (!planetParameters[planet]) throw new Error(`Unknown planet preset: ${planet}`);
      visualizer.setDebugMode(true, { skipPersist: true });
      visualizer.debug.mode = 'debug';
      visualizer.debug.modeSelect.value = 'debug';
      visualizer.applyPlanetPresetToSliders(planet);
      visualizer.applySlidersToGame();
    } else {
      visualizer.debug.mode = 'game';
      visualizer.updateZonalCoverageFromGameSafe();
      visualizer.updateSurfaceTextureFromPressure(true);
    }

    if (visualizer.debug.container) {
      visualizer.debug.container.style.display = 'none';
    }
    visualizer.onResize();
    visualizer.updateCloudUniforms();
    visualizer.animate();
    window.worldVisualizerBenchmarkProbe.attachVisualizer();

    return {
      mode: planet ? 'planet' : 'save',
      planet: planet || spaceManager.getCurrentPlanetKey(),
      visualizerSize: {
        width: visualizer.width,
        height: visualizer.height,
      },
    };
  }, { planet: options.planet, save: saveText });
}

async function runMeasurement(page, durationSeconds, sampleMs) {
  const setup = await page.evaluate(() => window.worldVisualizerBenchmarkProbe.sample(true));
  await page.evaluate(() => window.worldVisualizerBenchmarkProbe.beginMeasurement());

  const samples = [];
  const durationMs = durationSeconds * 1000;
  const startedAt = Date.now();
  while (Date.now() - startedAt < durationMs) {
    const remainingMs = durationMs - (Date.now() - startedAt);
    await page.waitForTimeout(Math.min(sampleMs, remainingMs));
    samples.push(await page.evaluate(() => window.worldVisualizerBenchmarkProbe.sample(true)));
  }
  const totals = await page.evaluate(() => window.worldVisualizerBenchmarkProbe.finishMeasurement());
  return { setup, totals, samples };
}

function compactTiming(timing) {
  return {
    count: timing.count,
    totalMs: timing.totalMs,
    meanMs: timing.meanMs,
    p95Ms: timing.p95Ms,
    p99Ms: timing.p99Ms,
    maxMs: timing.maxMs,
  };
}

function compactSetup(setup) {
  return {
    canvasCreates: setup.canvasCreates,
    generateCraterTexture: compactTiming(setup.timing.generateCraterTexture),
    updateCloudMeshTexture: compactTiming(setup.timing.updateCloudMeshTexture),
    surfaceUpdate: compactTiming(setup.timing.surfaceUpdate),
    shader: setup.shader,
    renderer: setup.renderer,
  };
}

function compactTotals(totals) {
  return {
    elapsedMs: totals.elapsedMs,
    canvasCreates: totals.canvasCreates,
    frames: totals.counters.frameCalls,
    frameInterval: compactTiming(totals.timing.frameInterval),
    frameDuration: compactTiming(totals.timing.frameDuration),
    generateCraterTexture: compactTiming(totals.timing.generateCraterTexture),
    updateCloudMeshTexture: compactTiming(totals.timing.updateCloudMeshTexture),
    surfaceUpdate: compactTiming(totals.timing.surfaceUpdate),
    shader: totals.shader,
    renderer: totals.renderer,
  };
}

function compactSample(sample) {
  return {
    elapsedMs: sample.elapsedMs,
    frames: sample.timing.frameDuration.count,
    frameIntervalMeanMs: sample.timing.frameInterval.meanMs,
    frameIntervalMaxMs: sample.timing.frameInterval.maxMs,
    frameDurationP95Ms: sample.timing.frameDuration.p95Ms,
    frameDurationMaxMs: sample.timing.frameDuration.maxMs,
    surfaceUpdateCalls: sample.timing.surfaceUpdate.count,
    surfaceUpdateMaxMs: sample.timing.surfaceUpdate.maxMs,
    generateCraterTextureCalls: sample.timing.generateCraterTexture.count,
    updateCloudMeshTextureCalls: sample.timing.updateCloudMeshTexture.count,
    basisReady: sample.shader.basisReady,
    compositeCount: sample.shader.compositeCount,
    textures: sample.renderer.textures,
    drawCalls: sample.renderer.drawCalls,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const saveText = options.save ? fs.readFileSync(options.save, 'utf8') : null;
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    throw new Error('Playwright is missing. Run npm ci before using the benchmark.');
  }

  const { server, origin } = await startStaticServer();
  let browser;
  try {
    const launchOptions = {
      headless: !options.headed,
      args: [
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    };
    if (options.channel !== 'bundled') {
      launchOptions.channel = options.channel;
    }
    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.stack || error.message);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await installCanvasProbe(page);
    await page.goto(`${origin}/index.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (
      window.planetVisualizer
      && window.planetVisualizer.renderer
      && window.PlanetVisualizer
      && document.querySelector('#planet-visualizer canvas')
    ), null, { timeout: 30000 });
    await installVisualizerProbe(page);
    const scene = await configureScene(page, options, saveText);
    const measurement = await runMeasurement(page, options.durationSeconds, options.sampleMs);
    const errors = {
      page: pageErrors,
      console: consoleErrors,
    };
    const checks = {
      noPageErrors: pageErrors.length === 0,
      noConsoleErrors: consoleErrors.length === 0,
      noCanvasCreation: measurement.totals.canvasCreates === 0,
      noCraterRebuilds: measurement.totals.counters.generateCraterTextureCalls === 0,
      stableTextureCount: (
        measurement.totals.renderer.start.textures
        === measurement.totals.renderer.end.textures
      ),
    };
    return {
      passed: Object.values(checks).every(Boolean),
      checks,
      scene: {
        ...scene,
        source: options.save ? path.relative(repoRoot, options.save) : options.planet,
      },
      durationSeconds: options.durationSeconds,
      sampleMs: options.sampleMs,
      setup: compactSetup(measurement.setup),
      totals: compactTotals(measurement.totals),
      samples: measurement.samples.map(compactSample),
      errors,
    };
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      throw new Error('Playwright Chromium is missing. Run: npx playwright install chromium');
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().then(report => {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) {
    process.exitCode = 1;
  }
}).catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
