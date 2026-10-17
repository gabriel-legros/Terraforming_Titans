#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const excludedDirectories = new Set(['.git', 'node_modules', 'dist']);
const saveExtensions = new Set(['.json', '.txt', '.sav', '.save']);

function parseArgs(argv) {
  const options = {
    filter: '',
    failed: null,
    timeout: 30000,
    output: path.join(repoRoot, 'artifacts', 'save-checks', 'report.json'),
    list: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: node scripts/check-saves.js [options]',
        '',
        'Recursively discover repository saves, load each in isolated Chromium,',
        'and advance one simulation step followed by a full UI refresh.',
        '',
        '  --filter <text>   Only paths containing this text (case insensitive)',
        '  --failed <path>   Retry only failed saves from an earlier JSON report',
        '  --timeout <ms>    Total time limit per save, including startup (default: 30000)',
        '  --output <path>   JSON report (default: artifacts/save-checks/report.json)',
        '  --list            List discovered saves without launching Chromium',
        '  --help            Show this help',
      ].join('\n'));
      process.exit(0);
    }
    if (arg === '--list') {
      options.list = true;
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
    if (arg === '--filter') options.filter = value.toLowerCase();
    else if (arg === '--failed') options.failed = path.resolve(value);
    else if (arg === '--output') options.output = path.resolve(value);
    else if (arg === '--timeout') {
      options.timeout = Number(value);
      if (!Number.isInteger(options.timeout) || options.timeout < 1 || options.timeout > 2147483647) {
        throw new Error('--timeout must be a positive integer no greater than 2147483647');
      }
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function discoverSaves(options) {
  const saves = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      // Do not follow symlinks/junctions into another checkout or outside the repository.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) visit(file);
        continue;
      }
      if (!entry.isFile() || !saveExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      if (file === options.output) continue;
      const relative = path.relative(repoRoot, file).split(path.sep).join('/');
      if (!relative.toLowerCase().includes(options.filter)) continue;
      const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      let isSave;
      try {
        const data = JSON.parse(text);
        isSave = data && ['resources', 'buildings', 'terraforming', 'dayNightCycle']
          .filter(key => Object.prototype.hasOwnProperty.call(data, key)).length >= 2;
      } catch (error) {
        // Keep malformed fixtures in save folders, and damaged saves with recognizable fields.
        isSave = relative.split('/').some(part => /(^|[_-])saves?([_.-]|$)/i.test(part))
          || (text.match(/"(?:resources|buildings|terraforming|dayNightCycle)"\s*:/g) || []).length >= 2;
      }
      if (isSave) saves.push(relative);
    }
  }
  visit(repoRoot);
  return saves.sort();
}

function startServer() {
  const contentTypes = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  };
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch (error) {
      response.writeHead(400).end();
      return;
    }
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }
    const file = path.resolve(repoRoot, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    if (!file.startsWith(repoRoot + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const stream = fs.createReadStream(file);
    stream.on('error', () => {
      if (!response.headersSent) response.writeHead(404);
      response.end();
    });
    stream.on('open', () => {
      response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
      stream.pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function checkSave(browser, origin, file, options) {
  const started = Date.now();
  const result = {
    file,
    stages: { startup: 'not-run', load: 'not-run', tick: 'not-run' },
    errors: [],
  };
  let phase = 'startup';
  let context;
  let timer;
  const watchdog = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Save exceeded ${options.timeout} ms during ${phase}`)), options.timeout);
  });
  const run = async () => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => {
      result.errors.push({ phase, kind: 'exception', message: error.stack || error.message });
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        result.errors.push({ phase, kind: 'console.error', message: message.text() });
      }
    });
    page.on('crash', () => {
      result.errors.push({ phase, kind: 'crash', message: 'Chromium renderer crashed' });
    });
    page.on('dialog', dialog => dialog.dismiss());
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        // Keep the real Phaser startup, but prevent uncontrolled simulation ticks.
        // This listener runs before game.js registers its startup listener.
        config.scene.update = () => {};
      });
    });
    await page.goto(`${origin}/index.html`, { waitUntil: 'load', timeout: options.timeout });
    await page.waitForFunction(() => game.scene.isActive('mainScene'), null, { timeout: options.timeout });
    await page.evaluate(() => game.loop.sleep());
    result.stages.startup = result.errors.length ? 'fail' : 'pass';
    if (result.stages.startup === 'fail') return;

    phase = 'load';
    const saveText = fs.readFileSync(path.join(repoRoot, file), 'utf8').replace(/^\uFEFF/, '');
    await page.evaluate(text => {
      // Exercise enabled save automation too, without waiting for the restore popup.
      restoreAutomationOnStartupWithoutPrompt = true;
      try {
        if (!loadGame(text)) throw new Error('loadGame returned false');
      } finally {
        restoreAutomationOnStartupWithoutPrompt = false;
      }
      game.loop.sleep();
    }, saveText);
    await page.waitForTimeout(50);
    result.stages.load = result.errors.some(error => error.phase === phase) ? 'fail' : 'pass';

    phase = 'tick';
    result.tick = await page.evaluate(() => {
      const realDelta = terraformingParameters.gameplay.simulation.resourceSubstepMs;
      const delta = realDelta * (gameSpeed || 1);
      // Calling logic directly also exercises saves that were paused when exported.
      updateLogic(delta, realDelta);
      updateRender.lastDelta = delta;
      updateRender(true, { forceAllSubtabs: true });
      return { realDeltaMs: realDelta, simulationDeltaMs: delta };
    });
    await page.waitForTimeout(50);
    result.stages.tick = result.errors.some(error => error.phase === phase) ? 'fail' : 'pass';
  };
  try {
    await Promise.race([run(), watchdog]);
  } catch (error) {
    result.stages[phase] = 'fail';
    result.errors.push({ phase, kind: 'failure', message: error.stack || error.message });
  } finally {
    clearTimeout(timer);
    if (context) await context.close();
  }
  result.passed = Object.values(result.stages).every(status => status === 'pass') && result.errors.length === 0;
  result.durationMs = Date.now() - started;
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const saves = options.failed
    ? JSON.parse(fs.readFileSync(options.failed, 'utf8')).results
      .filter(result => !result.passed && result.file.toLowerCase().includes(options.filter))
      .map(result => result.file)
    : discoverSaves(options);
  if (!saves.length) throw new Error('No save files found matching the scan');
  console.log(`Found ${saves.length} saves.`);
  if (options.list) {
    saves.forEach(file => console.log(file));
    return;
  }
  const { server, origin } = await startServer();
  let browser;
  const results = [];
  const startedAt = new Date().toISOString();
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    for (const file of saves) {
      const result = await checkSave(browser, origin, file, options);
      results.push(result);
      console.log(`[${results.length}/${saves.length}] ${result.passed ? 'PASS' : 'FAIL'} ${file}`);
      for (const error of result.errors) console.error(`  ${error.phase}: ${error.message}`);
      const passed = results.filter(entry => entry.passed).length;
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      // Save progress after every file so an interrupted audit still has a useful report.
      fs.writeFileSync(options.output, JSON.stringify({
        startedAt, finishedAt: results.length === saves.length ? new Date().toISOString() : null,
        total: saves.length, checked: results.length, passed, failed: results.length - passed, results,
      }, null, 2) + '\n');
    }
    const failed = results.filter(result => !result.passed).length;
    console.log(`\n${results.length - failed} passed, ${failed} failed, ${results.length} total.`);
    console.log(`Report: ${options.output}`);
    if (failed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
