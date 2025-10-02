const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG Auto mode skips locked types', () => {
  test('Auto mode does not select locked archetypes', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="space-random"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`
      const defaultPlanetParameters = { name: 'Default', resources: { colony: {}, surface: {}, underground: {}, atmospheric: {}, special: {} }, buildingParameters: {}, populationParameters: {}, celestialParameters: {} };
      function formatNumber(n){ return n; }
      function estimateFlux(){ return 1000; }
      function estimateGasPressure(){ return undefined; }
      ${rwgCode}
      const realGen = generateRandomPlanet;
      generateRandomPlanet = function(seed, opts){ const r = realGen(seed, opts); globalThis.lastResult = r; return r; };
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);
    dom.window.document.getElementById('rwg-seed').value = '42';
    dom.window.document.getElementById('rwg-generate-planet').click();
    expect(ctx.lastResult.archetype).not.toBe('venus-like');
  });

  test('High flux does not force locked venus-like', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="space-random"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`
      const defaultPlanetParameters = { name: 'Default', resources: { colony: {}, surface: {}, underground: {}, atmospheric: {}, special: {} }, buildingParameters: {}, populationParameters: {}, celestialParameters: {} };
      function formatNumber(n){ return n; }
      function estimateFlux(){ return 3000; }
      function estimateGasPressure(){ return undefined; }
      ${rwgCode}
      const realGen = generateRandomPlanet;
      generateRandomPlanet = function(seed, opts){ const r = realGen(seed, opts); globalThis.lastResult = r; return r; };
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);
    dom.window.document.getElementById('rwg-seed').value = '99';
    dom.window.document.getElementById('rwg-generate-planet').click();
    expect(ctx.lastResult.archetype).not.toBe('venus-like');
  });
});
