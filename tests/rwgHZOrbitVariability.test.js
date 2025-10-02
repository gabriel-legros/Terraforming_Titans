const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

describe('Random World Generator HZ orbit variability', () => {
  test('hz-mid orbit flux differs across seeds', () => {
    const dom = new JSDOM('<div id="rwg-result"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.captureRes = null;
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
    const rwgCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwg.js'), 'utf8');
    const rwgUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'rwgUI.js'), 'utf8');
    vm.runInContext(`${rwgCode}\n${rwgUICode}\nrenderWorldDetail=function(res){captureRes=res;return ''};`, ctx);
    vm.runInContext(`drawSingle('seed-one', { target: 'planet', orbitPreset: 'hz-mid' });`, ctx);
    const fluxA = vm.runInContext('estimateFlux(captureRes);', ctx);
    vm.runInContext(`drawSingle('seed-two', { target: 'planet', orbitPreset: 'hz-mid' });`, ctx);
    const fluxB = vm.runInContext('estimateFlux(captureRes);', ctx);
    expect(fluxA).not.toBeCloseTo(fluxB, 10);
  });
});
