const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Random World Generator type display names', () => {
  test('dropdown shows custom display names', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    vm.createContext(ctx);

    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
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
      ${spaceUICode}
      ${rwgCode}
      ${rwgUICode}
      initializeRandomWorldUI();
    `, ctx);

    const icyOpt = dom.window.document.querySelector('#rwg-type option[value="icy-moon"]');
    const carbonOpt = dom.window.document.querySelector('#rwg-type option[value="carbon-planet"]');
    expect(icyOpt.textContent).toBe('Type: Icy');
    expect(carbonOpt.textContent).toBe('Type: Carbon');
  });
});

