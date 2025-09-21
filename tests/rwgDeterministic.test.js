const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Random World Generator determinism and UI', () => {
  test('same seed generates identical system', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const ctx = vm.createContext({ console });
    // Minimal globals expected by rwg.js
    vm.runInContext(`
      function isObject(o){ return o && typeof o === 'object' && !Array.isArray(o); }
      function deepMerge(a,b){
        if(!isObject(a) || !isObject(b)) return { ...(a||{}), ...(b||{}) };
        const out = { ...a };
        Object.keys(b).forEach(k => { out[k] = isObject(a[k]) && isObject(b[k]) ? deepMerge(a[k], b[k]) : b[k]; });
        return out;
      }
      const defaultPlanetParameters = { name:'Default', resources:{ colony:{}, surface:{}, underground:{}, atmospheric:{}, special:{} }, buildingParameters:{}, populationParameters:{}, celestialParameters:{} };
    `, ctx);
    vm.runInContext(code + '; this.generateSystem = generateSystem;', ctx);
    const seed = 'alpha-1234';
    const a = vm.runInContext('generateSystem("' + seed + '", 5)', ctx);
    const b = vm.runInContext('generateSystem("' + seed + '", 5)', ctx);
    expect(a.star.name).toBe(b.star.name);
    expect(a.planets.length).toBe(b.planets.length);
    for (let i = 0; i < a.planets.length; i++) {
      expect(a.planets[i].name).toBe(b.planets[i].name);
      expect(a.planets[i].orbitAU).toBeCloseTo(b.planets[i].orbitAU, 10);
      expect(a.planets[i].merged.gravityPenaltyEnabled).toBe(true);
    }
  });

  test('Random tab UI initializes and renders world', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="space-subtab" data-subtab="space-random"></div>
      <div id="space-random" class="space-subtab-content"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`
      function isObject(o){ return o && typeof o === 'object' && !Array.isArray(o); }
      function deepMerge(a,b){
        if(!isObject(a) || !isObject(b)) return { ...(a||{}), ...(b||{}) };
        const out = { ...a };
        Object.keys(b).forEach(k => { out[k] = isObject(a[k]) && isObject(b[k]) ? deepMerge(a[k], b[k]) : b[k]; });
        return out;
      }
      const defaultPlanetParameters = { name:'Default', resources:{ colony:{}, surface:{}, underground:{}, atmospheric:{}, special:{} }, buildingParameters:{}, populationParameters:{}, celestialParameters:{} };
      ${rwgCode}
      ${rwgUICode}
      initializeRandomWorldUI();
      drawSingle('ui-seed', { isMoon: false, orbitPreset: 'hz-mid' });`, ctx);
    const result = dom.window.document.getElementById('rwg-result');
    expect(result).not.toBeNull();
    expect(result.innerHTML).toContain('Star:');
    // World title renders with generated name; ensure a value is shown
    expect(result.innerHTML).toMatch(/<h3>.*<\/h3>/);
  });
});


