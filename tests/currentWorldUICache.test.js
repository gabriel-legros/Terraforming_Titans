const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');
const { planetParameters } = require('../src/js/planet-parameters.js');
const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');

function loadScript(file, ctx) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8');
  vm.runInContext(code, ctx);
}

describe('current world UI caching', () => {
  test('skips rendering when world is unchanged', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="planet-selection-options"></div><div id="travel-status"></div><span id="current-world-name"></span><div id="current-world-details"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.console = console;
    ctx.planetParameters = planetParameters;
    ctx.calculateAtmosphericPressure = () => 0;
    ctx.dayNightTemperaturesModel = () => ({ mean: 0, day: 0, night: 0 });
    ctx.getGameSpeed = () => 1;
    ctx.setGameSpeed = () => {};
    ctx.runEquilibration = async () => ({ res: {} });
    ctx.deepMerge = (a, b) => ({ ...a, ...b });
    ctx.defaultPlanetParameters = {};
    ctx.initializeGameState = () => {};
    ctx.renderWorldDetail = jest.fn(() => '<div class="detail"></div>');

    vm.runInContext(`${effectCode}\n${spaceCode}; this.EffectableEntity = EffectableEntity; this.SpaceManager = SpaceManager;`, ctx);
    loadScript('spaceUI.js', ctx);

    ctx.spaceManager = new ctx.SpaceManager(planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);

    expect(ctx.renderWorldDetail).toHaveBeenCalledTimes(1);

    const details = dom.window.document.getElementById('current-world-details');
    const firstNode = details.firstElementChild;

    ctx.updateSpaceUI();

    expect(ctx.renderWorldDetail).toHaveBeenCalledTimes(1);
    expect(details.firstElementChild).toBe(firstNode);
  });
});
