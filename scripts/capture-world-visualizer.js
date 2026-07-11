#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutput = path.join(repoRoot, 'artifacts', 'screenshots', 'world-visualizer.png');

function printHelp() {
  console.log([
    'Usage: node scripts/capture-world-visualizer.js [options]',
    '',
    'Options:',
    '  --output <path>                 PNG output path',
    '  --planet <key>                  Planet preset key. Default: mars',
    '  --biomass <tropical,temperate,polar>',
    '  --hazardous-biomass <tropical,temperate,polar>',
    '  --water <tropical,temperate,polar>',
    '  --ice <tropical,temperate,polar>',
    '  --clouds <percent>              Cloud coverage override',
    '  --nanoworld                     Enable the completed Nanoworld surface',
    '  --base-color <#rrggbb>          Surface base-colour override',
    '  --illumination <value>          Visualizer illumination override',
    '  --rotation <0..1>               Fixed day-cycle rotation. Default: 0.08',
    '  --size <pixels>                 Square image size. Default: 768',
    '  --settle <milliseconds>         Wait after rendering. Default: 300',
    '  --headed                        Show the browser while capturing',
    '  --help                          Show this help'
  ].join('\n'));
}

function parseTriplet(value, flag) {
  const values = String(value).split(',').map(part => Number(part.trim()));
  if (values.length !== 3 || values.some(number => !Number.isFinite(number) || number < 0 || number > 100)) {
    throw new Error(`${flag} requires three comma-separated percentages from 0 to 100`);
  }
  return values;
}

function parseNumber(value, flag, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${flag} must be between ${min} and ${max}`);
  }
  return number;
}

function parseArgs(argv) {
  const options = {
    output: defaultOutput,
    planet: 'mars',
    biomass: null,
    hazardousBiomass: null,
    water: null,
    ice: null,
    clouds: null,
    nanoworld: false,
    baseColor: null,
    illumination: null,
    rotation: 0.08,
    size: 768,
    settleMs: 300,
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
    if (arg === '--nanoworld') {
      options.nanoworld = true;
      continue;
    }
    if (!next || next.startsWith('--')) {
      throw new Error(`${arg} requires a value`);
    }
    if (arg === '--output') options.output = path.resolve(next);
    else if (arg === '--planet') options.planet = next;
    else if (arg === '--biomass') options.biomass = parseTriplet(next, arg);
    else if (arg === '--hazardous-biomass') options.hazardousBiomass = parseTriplet(next, arg);
    else if (arg === '--water') options.water = parseTriplet(next, arg);
    else if (arg === '--ice') options.ice = parseTriplet(next, arg);
    else if (arg === '--clouds') options.clouds = parseNumber(next, arg, 0, 100);
    else if (arg === '--base-color') {
      if (!/^#[0-9a-f]{6}$/i.test(next)) throw new Error('--base-color must use #rrggbb format');
      options.baseColor = next;
    } else if (arg === '--illumination') options.illumination = parseNumber(next, arg, 0, 3);
    else if (arg === '--rotation') options.rotation = parseNumber(next, arg, 0, 1);
    else if (arg === '--size') options.size = Math.round(parseNumber(next, arg, 128, 2048));
    else if (arg === '--settle') options.settleMs = Math.round(parseNumber(next, arg, 0, 10000));
    else throw new Error(`Unknown argument: ${arg}`);
    index++;
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
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function configureVisualizer(page, options) {
  await page.evaluate(scene => {
    openTerraformingWorldTab();
    hideLoadingOverlay();
    document.querySelectorAll('.popup-overlay, .system-popup-overlay, .wgc-popup-overlay').forEach(overlay => overlay.remove());
    window.popupActive = false;
    const visualizer = window.planetVisualizer;
    if (!visualizer) throw new Error('Planet visualizer did not initialize');
    if (!planetParameters[scene.planet]) throw new Error(`Unknown planet preset: ${scene.planet}`);

    visualizer.setDebugMode(true, { skipPersist: true });
    visualizer.debug.mode = 'debug';
    visualizer.debug.modeSelect.value = 'debug';
    visualizer.applyPlanetPresetToSliders(scene.planet);

    const rows = visualizer.debug.rows;
    const setValue = (pair, value) => {
      if (value === null || !pair) return;
      pair.range.value = String(value);
      pair.number.value = String(value);
    };
    const setZones = (values, tropical, temperate, polar) => {
      if (!values) return;
      setValue(rows[tropical], values[0]);
      setValue(rows[temperate], values[1]);
      setValue(rows[polar], values[2]);
    };

    setZones(scene.biomass, 'bTrop', 'bTemp', 'bPol');
    setZones(scene.hazardousBiomass, 'hbTrop', 'hbTemp', 'hbPol');
    setZones(scene.water, 'wTrop', 'wTemp', 'wPol');
    setZones(scene.ice, 'iTrop', 'iTemp', 'iPol');
    setValue(rows.cloudCov, scene.clouds);
    setValue(rows.nanoworld, scene.nanoworld ? 100 : 0);
    setValue(rows.illum, scene.illumination);
    visualizer.applySlidersToGame();

    if (scene.baseColor) {
      visualizer.setBaseColor(scene.baseColor, { force: true });
    }

    const container = document.getElementById('planet-visualizer');
    container.style.width = `${scene.size}px`;
    container.style.maxWidth = 'none';
    container.style.height = `${scene.size}px`;
    container.style.boxSizing = 'border-box';
    container.style.aspectRatio = 'auto';
    container.style.margin = '0';
    visualizer.debug.container.style.display = 'none';

    dayNightCycle.setDayProgress(scene.rotation);
    dayNightCycle.update = () => {};
    visualizer.rotationSpeed = 0;
    visualizer.cloudDrift = 0;
    visualizer.cloudDriftSpeed = 0;
    visualizer.onResize();
    visualizer.updateSurfaceTextureFromPressure(true);
    visualizer.updateCloudUniforms();
    visualizer.animate();
  }, options);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    throw new Error('Playwright is missing. Run npm ci before using the screenshot harness.');
  }

  const { server, origin } = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({
      headless: !options.headed,
      args: ['--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const context = await browser.newContext({
      viewport: { width: Math.max(1400, options.size + 100), height: Math.max(1000, options.size + 100) },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(error.stack || error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => (
        window.planetVisualizer
        && window.planetVisualizer.renderer
        && document.querySelector('#planet-visualizer canvas')
        && typeof openTerraformingWorldTab === 'function'
      ), null, { timeout: 30000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        readyState: document.readyState,
        visualizerExists: !!window.planetVisualizer,
        rendererExists: !!window.planetVisualizer?.renderer,
        canvasExists: !!document.querySelector('#planet-visualizer canvas'),
        runtimeFailed: !!window.planetVisualizerRuntimeFailed,
        failureReason: window.planetVisualizerRuntimeFailureReason || '',
      }));
      throw new Error([
        error.message,
        `Visualizer state: ${JSON.stringify(state)}`,
        ...pageErrors.map(message => `Page error: ${message}`),
        ...consoleErrors.map(message => `Console error: ${message}`),
      ].join('\n'));
    }

    await configureVisualizer(page, options);
    await page.waitForTimeout(options.settleMs);
    await page.evaluate(() => window.planetVisualizer.animate());

    if (pageErrors.length) {
      throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
    }

    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    await page.locator('#planet-visualizer').screenshot({ path: options.output, type: 'png' });
    console.log(`World visualizer screenshot: ${options.output}`);
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

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
