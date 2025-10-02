const realSetTimeout = global.setTimeout;
const realClearTimeout = global.clearTimeout;

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => realSetTimeout(cb, 0);
}
if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => realClearTimeout(id);
}

if (typeof global.window !== 'undefined') {
  if (typeof global.window.requestAnimationFrame === 'undefined') {
    global.window.requestAnimationFrame = global.requestAnimationFrame;
  }
  if (typeof global.window.cancelAnimationFrame === 'undefined') {
    global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  }
}

// Provide a structuredClone polyfill for Node environments that lack it
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (value) => {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  };
}

// Silence noisy console output during tests
['log', 'info', 'warn', 'error'].forEach(method => {
  jest.spyOn(console, method).mockImplementation(() => {});
});

// Provide minimal globals expected by terraforming utilities
if (typeof global.resources === 'undefined') {
  global.resources = { atmospheric: {} };
}
if (typeof global.calculateAtmosphericPressure === 'undefined') {
  global.calculateAtmosphericPressure = () => 0;
}

// Provide a no-op addEffect so modules can call it without crashing
if (typeof global.addEffect === 'undefined') {
  global.addEffect = () => {};
}

// Map dynamic jsdom path requires to the installed jsdom package
try {
  const Module = require('module');
  const path = require('path');

  // Add global npm node_modules to resolution paths on Windows user installs
  if (process.platform === 'win32' && process.env.APPDATA) {
    const globalNpmPath = path.join(process.env.APPDATA, 'npm', 'node_modules');
    if (!Module.globalPaths.includes(globalNpmPath)) {
      Module.globalPaths.unshift(globalNpmPath);
    }
  }

  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, isMain, options) {
    try {
      if (typeof request === 'string' && /[\\\/]lib[\\\/]node_modules[\\\/]jsdom$/.test(request)) {
        return require.resolve('jsdom');
      }
    } catch (e) {
      // fall through to default resolver
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
} catch (e) {
  // If Module monkey-patching fails, tests that use dynamic jsdom paths may still fail
}
