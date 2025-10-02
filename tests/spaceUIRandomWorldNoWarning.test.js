const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const { planetParameters } = require('../src/js/planet-parameters.js');
const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');

function loadScript(file, ctx) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8');
  vm.runInContext(code, ctx);
}

describe('space UI warning on random world', () => {
  test('no warning or block when on random world', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="planet-selection-options"></div><div id="travel-status"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.console = console;
    ctx.planetParameters = planetParameters;
    ctx.saveGameToSlot = () => {};
    ctx.projectManager = { projects: { spaceStorage: { saveTravelState: () => null, loadTravelState: () => {} } } };
    ctx.nanotechManager = { prepareForTravel: () => {} };
    ctx.initializeGameState = () => {};
    ctx.updateProjectUI = () => {};
    ctx.skillManager = { skillPoints: 0 };

    vm.runInContext(`${effectCode}\n${spaceCode}; this.EffectableEntity = EffectableEntity; this.SpaceManager = SpaceManager;`, ctx);
    loadScript('spaceUI.js', ctx);

    ctx.spaceManager = new ctx.SpaceManager(planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);
    ctx.spaceManager.setRwgLock('mars', true);
    ctx.spaceManager.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    ctx.updateSpaceUI();

    const status = dom.window.document.getElementById('travel-status');
    expect(status.style.display).toBe('none');
    expect(status.textContent).toBe('');
    const titanButton = dom.window.document.querySelector('.select-planet-button[data-planet-key="titan"]');
    expect(titanButton.disabled).toBe(false);
  });
});
