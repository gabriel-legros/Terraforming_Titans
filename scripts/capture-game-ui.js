#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutput = path.join(repoRoot, 'artifacts', 'screenshots', 'game-ui.png');

function printHelp() {
  console.log([
    'Usage: node scripts/capture-game-ui.js [options]',
    '',
    'Capture a stable screenshot of any game element selected with CSS.',
    '',
    'Options:',
    '  --selector <css>                Element to capture. Default: body',
    '  --index <number>                Zero-based match index. Default: 0',
    '  --output <path>                 PNG output path',
    '  --setup <path>                  Page-side JavaScript run before capture',
    '  --url <path>                    Served page path. Default: /index.html',
    '  --theme <mode>                  light, darkGrey, darkBlue, or oledBlack',
    '  --viewport <width>x<height>     Browser viewport. Default: 1440x1000',
    '  --padding <pixels>              Space around the selected element',
    '  --settle <milliseconds>         Wait after setup. Default: 300',
    '  --timeout <milliseconds>        Page and selector timeout. Default: 30000',
    '  --full-page                     Capture the full page instead of the selector',
    '  --headed                        Show the browser while capturing',
    '  --help                          Show this help',
    '',
    'Setup scripts run inside the loaded game page and can call game globals directly.'
  ].join('\n'));
}

function parseNumber(value, flag, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${flag} must be between ${min} and ${max}`);
  }
  return number;
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) throw new Error('--viewport must use WIDTHxHEIGHT format');
  return {
    width: Math.round(parseNumber(match[1], '--viewport width', 320, 7680)),
    height: Math.round(parseNumber(match[2], '--viewport height', 240, 4320)),
  };
}

function parseArgs(argv) {
  const options = {
    selector: 'body',
    index: 0,
    output: defaultOutput,
    setup: null,
    url: '/index.html',
    theme: null,
    viewport: { width: 1440, height: 1000 },
    padding: 0,
    settleMs: 300,
    timeoutMs: 30000,
    fullPage: false,
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
    if (arg === '--full-page') {
      options.fullPage = true;
      continue;
    }
    if (!next || next.startsWith('--')) {
      throw new Error(`${arg} requires a value`);
    }
    if (arg === '--selector') options.selector = next;
    else if (arg === '--index') options.index = Math.round(parseNumber(next, arg, 0, 10000));
    else if (arg === '--output') options.output = path.resolve(next);
    else if (arg === '--setup') options.setup = path.resolve(next);
    else if (arg === '--url') options.url = next.startsWith('/') ? next : `/${next}`;
    else if (arg === '--theme') {
      if (!['light', 'darkGrey', 'darkBlue', 'oledBlack'].includes(next)) {
        throw new Error('--theme must be light, darkGrey, darkBlue, or oledBlack');
      }
      options.theme = next;
    } else if (arg === '--viewport') options.viewport = parseViewport(next);
    else if (arg === '--padding') options.padding = Math.round(parseNumber(next, arg, 0, 500));
    else if (arg === '--settle') options.settleMs = Math.round(parseNumber(next, arg, 0, 30000));
    else if (arg === '--timeout') options.timeoutMs = Math.round(parseNumber(next, arg, 1000, 120000));
    else throw new Error(`Unknown argument: ${arg}`);
    index++;
  }

  if (options.setup && !fs.existsSync(options.setup)) {
    throw new Error(`Setup script not found: ${options.setup}`);
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

async function captureSelectedElement(page, options) {
  const locator = page.locator(options.selector).nth(options.index);
  await locator.waitFor({ state: 'visible', timeout: options.timeoutMs });
  await locator.scrollIntoViewIfNeeded();

  if (options.padding === 0) {
    await locator.screenshot({ path: options.output, type: 'png', animations: 'disabled' });
    return;
  }

  const box = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  });
  if (box.width === 0 || box.height === 0) {
    throw new Error(`Selected element has no capture box: ${options.selector}`);
  }
  const documentSize = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  }));
  const x = Math.max(0, box.x - options.padding);
  const y = Math.max(0, box.y - options.padding);
  const clip = {
    x,
    y,
    width: Math.min(documentSize.width - x, box.width + options.padding * 2),
    height: Math.min(documentSize.height - y, box.height + options.padding * 2),
  };
  await page.screenshot({ path: options.output, type: 'png', clip, animations: 'disabled' });
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
    browser = await chromium.launch({ headless: !options.headed });
    const context = await browser.newContext({
      viewport: options.viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(error.stack || error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${origin}${options.url}`, { waitUntil: 'load', timeout: options.timeoutMs });
    if (options.theme) {
      await page.evaluate(theme => {
        gameSettings.themeMode = theme;
        applyThemeModeSetting();
      }, options.theme);
    }
    if (options.setup) {
      const setupSource = fs.readFileSync(options.setup, 'utf8');
      await page.evaluate(async source => {
        const setup = new Function(`return (async () => {\n${source}\n})();`);
        await setup();
      }, setupSource);
    }
    await page.waitForTimeout(options.settleMs);

    if (pageErrors.length) {
      throw new Error(`Page errors:\n${pageErrors.join('\n')}`);
    }

    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    if (options.fullPage) {
      await page.screenshot({
        path: options.output,
        type: 'png',
        fullPage: true,
        animations: 'disabled',
      });
    } else {
      await captureSelectedElement(page, options);
    }
    console.log(`Game UI screenshot: ${options.output}`);
    console.log(`Selector: ${options.selector} (match ${options.index})`);
    if (consoleErrors.length) {
      console.log(`Console errors observed: ${consoleErrors.length}`);
    }
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
