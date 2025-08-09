const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Space Random tab integrates RWG UI', () => {
  test('showSpaceRandomTab initializes RWG UI once', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="space-subtab hidden" data-subtab="space-random"></div>
      <div id="space-random" class="space-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
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
      showSpaceRandomTab();
      ensureRandomWorldUI();`, ctx);
    const tab = dom.window.document.querySelector('[data-subtab="space-random"]');
    const content = dom.window.document.getElementById('space-random');
    expect(tab.classList.contains('hidden')).toBe(false);
    expect(content.classList.contains('hidden')).toBe(false);
    expect(content.querySelector('#rwg-seed')).not.toBeNull();
    expect(content.querySelector('#rwg-target')).not.toBeNull();
    expect(content.querySelector('#rwg-generate-planet')).not.toBeNull();
  });
});


