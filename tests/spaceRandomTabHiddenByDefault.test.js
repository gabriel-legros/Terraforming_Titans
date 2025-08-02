const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Space Random subtab hidden by default', () => {
  test('initializeSpaceUI keeps Random subtab hidden', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="space-subtab" data-subtab="space-story"></div>
      <div class="space-subtab hidden" data-subtab="space-random"></div>
      <div id="space-story" class="space-subtab-content active">
        <div id="planet-selection-options"></div>
        <div id="travel-status"></div>
      </div>
      <div id="space-random" class="space-subtab-content hidden"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.planetParameters = {
      mars: { name: 'Mars', celestialParameters: { distanceFromSun: 1, gravity: 3.7, radius: 3389, albedo: 0.25 } }
    };
    vm.createContext(ctx);
    const uiUtilsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ui-utils.js'), 'utf8');
    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');
    const spaceUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'spaceUI.js'), 'utf8');
    vm.runInContext(`${uiUtilsCode}\n${effectCode}\n${spaceCode}\n${spaceUICode}; this.SpaceManager = SpaceManager;`, ctx);
    ctx.spaceManager = new ctx.SpaceManager(ctx.planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);
    const tab = dom.window.document.querySelector('[data-subtab="space-random"]');
    const content = dom.window.document.getElementById('space-random');
    const visible = vm.runInContext('spaceRandomTabVisible', ctx);
    expect(visible).toBe(false);
    expect(tab.classList.contains('hidden')).toBe(true);
    expect(content.classList.contains('hidden')).toBe(true);
  });
});
