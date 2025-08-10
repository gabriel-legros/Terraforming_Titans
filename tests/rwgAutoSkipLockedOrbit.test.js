const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG Auto mode skips locked hot orbit', () => {
  test('Auto mode does not select locked hot orbit', () => {
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
      function generateRandomPlanet(seed, opts){
        return {
          star: opts.star,
          orbitAU: opts.aAU,
          override: { classification: { archetype: 'test' } },
          merged: { name: 'Test', celestialParameters: { radius: 1, gravity: 1, albedo: 0.3, rotationPeriod: 24 }, resources: { atmospheric: {}, surface: {}, underground: {}, colony: {}, special: {} } }
        };
      }
      ${rwgCode}
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);
    dom.window.document.getElementById('rwg-seed').value = '123';
    dom.window.document.getElementById('rwg-generate-planet').click();
    const orbit = dom.window.document.getElementById('rwg-orbit').value;
    expect(orbit).not.toBe('auto');
    expect(orbit).not.toBe('hot');
    expect(['hz-inner','hz-mid','hz-outer','cold']).toContain(orbit);
  });
});
