const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG target auto mode', () => {
  test('auto target chooses moon or planet based on seed', () => {
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
      globalThis.callArgs = [];
      generateRandomPlanet = function(seed, opts){
        globalThis.callArgs.push(opts);
        return {
          star: opts.star,
          orbitAU: opts.aAU,
          override: { classification: { archetype: opts.archetype } },
          merged: { name: 'Test', celestialParameters: { radius: 1, gravity: 1, albedo: 0.3, rotationPeriod: 24 }, resources: { atmospheric: {}, surface: {}, underground: {}, colony: {}, special: {} } }
        };
      };
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);

    function findSeed(desired){
      for(let i=0;i<5000;i++){
        const s = String(i);
        const h = ctx.hashStringToInt(s);
        const rng = ctx.mulberry32(h);
        const aAU = ctx.sampleOrbitAU(rng, 0);
        const isMoon = (aAU > 3 && rng() < 0.35);
        if(isMoon === desired) return s;
      }
      throw new Error('seed not found');
    }

    const moonSeed = findSeed(true);
    dom.window.document.getElementById('rwg-seed').value = moonSeed;
    dom.window.document.getElementById('rwg-target').value = 'auto';
    dom.window.document.getElementById('rwg-generate-planet').click();
    expect(ctx.callArgs.pop().isMoon).toBe(true);

    ctx.callArgs = [];
    const planetSeed = findSeed(false);
    dom.window.document.getElementById('rwg-seed').value = planetSeed;
    dom.window.document.getElementById('rwg-target').value = 'auto';
    dom.window.document.getElementById('rwg-generate-planet').click();
    expect(ctx.callArgs.pop().isMoon).toBe(false);
  });
});
