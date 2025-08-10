const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('RWG seed encodes selections and overrides menus', () => {
  test('seed remembers dropdowns and overrides them when reused', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="space-random"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`
      const defaultPlanetParameters = { name:'Default', resources:{ colony:{}, surface:{}, underground:{}, atmospheric:{}, special:{} }, buildingParameters:{}, populationParameters:{}, celestialParameters:{} };
      function formatNumber(n){ return n; }
      function estimateFlux(){ return 1000; }
      function estimateGasPressure(){ return undefined; }
      globalThis.callArgs = [];
      generateRandomPlanet = function(seed, opts){
        callArgs.push(opts);
        return {
          star: opts.star,
          orbitAU: opts.aAU,
          override:{ classification:{ archetype: opts.archetype } },
          merged:{ name:'Test', celestialParameters:{ radius:1, gravity:1, albedo:0.3, rotationPeriod:24 }, resources:{ atmospheric:{}, surface:{}, underground:{}, colony:{}, special:{} } }
        };
      };
      ${rwgCode}
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);
    const doc = dom.window.document;
    doc.getElementById('rwg-target').value = 'moon';
    doc.getElementById('rwg-type').value = 'icy-moon';
    doc.getElementById('rwg-orbit').value = 'hz-inner';
    doc.getElementById('rwg-seed').value = '';
    doc.getElementById('rwg-generate-planet').click();
    const seedText = (() => {
      const chips = Array.from(doc.querySelectorAll('.rwg-chip'));
      const chip = chips.find(c => c.querySelector('.label')?.textContent === 'Seed');
      return chip?.querySelector('.value')?.textContent || '';
    })();
    expect(seedText).toContain('|moon|');
    expect(seedText).toContain('|icy-moon|');
    expect(seedText.endsWith('|hz-inner')).toBe(true);
    const first = ctx.callArgs[0];
    doc.getElementById('rwg-target').value = 'planet';
    doc.getElementById('rwg-type').value = 'mars-like';
    doc.getElementById('rwg-orbit').value = 'cold';
    doc.getElementById('rwg-seed').value = seedText;
    doc.getElementById('rwg-generate-planet').click();
    const second = ctx.callArgs[1];
    expect(second.isMoon).toBe(first.isMoon);
    expect(second.archetype).toBe(first.archetype);
    expect(second.aAU).toBeCloseTo(first.aAU, 10);
    expect(doc.getElementById('rwg-target').value).toBe('moon');
    expect(doc.getElementById('rwg-type').value).toBe('icy-moon');
    expect(doc.getElementById('rwg-orbit').value).toBe('hz-inner');
  });
});
