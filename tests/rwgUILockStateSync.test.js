const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Random World Generator lock UI sync', () => {
  test('dropdown options reflect manager lock state', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div id="space-random"></div>` , { runScripts: 'outside-only' });
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

    const hotOpt = dom.window.document.querySelector('#rwg-orbit option[value="hot"]');
    const coldOpt = dom.window.document.querySelector('#rwg-orbit option[value="cold"]');
    const veryColdOpt = dom.window.document.querySelector('#rwg-orbit option[value="very-cold"]');
    const venusOpt = dom.window.document.querySelector('#rwg-type option[value="venus-like"]');
    const marsOpt = dom.window.document.querySelector('#rwg-type option[value="mars-like"]');

    expect(hotOpt.disabled).toBe(true);
    expect(venusOpt.disabled).toBe(true);
    expect(veryColdOpt.disabled).toBe(false);

    vm.runInContext('rwgManager.unlockOrbit("hot"); rwgManager.unlockType("venus-like"); updateSpaceUI();', ctx);
    expect(hotOpt.disabled).toBe(false);
    expect(hotOpt.textContent.includes("Locked")).toBe(false);
    expect(venusOpt.disabled).toBe(false);
    expect(venusOpt.textContent.includes("Locked")).toBe(false);

    vm.runInContext('rwgManager.lockOrbit("cold"); rwgManager.lockOrbit("very-cold"); rwgManager.lockType("mars-like"); updateSpaceUI();', ctx);
    expect(coldOpt.disabled).toBe(true);
    expect(coldOpt.textContent.includes("Locked")).toBe(true);
    expect(veryColdOpt.disabled).toBe(true);
    expect(veryColdOpt.textContent.includes("Locked")).toBe(true);
    expect(marsOpt.disabled).toBe(true);
    expect(marsOpt.textContent.includes("Locked")).toBe(true);
  });
});

