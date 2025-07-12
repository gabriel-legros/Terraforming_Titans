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

describe('initializeSpaceUI only generates elements once', () => {
  test('calling initializeSpaceUI twice does not duplicate planet options', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="planet-selection-options"></div><div id="travel-status"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.formatNumber = numbers.formatNumber;
    ctx.console = console;
    ctx.planetParameters = planetParameters;

    vm.runInContext(`${effectCode}\n${spaceCode}; this.EffectableEntity = EffectableEntity; this.SpaceManager = SpaceManager;`, ctx);
    loadScript('spaceUI.js', ctx);

    ctx.spaceManager = new ctx.SpaceManager(planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);

    const container = dom.window.document.getElementById('planet-selection-options');
    const initialCount = container.querySelectorAll('.planet-option').length;

    ctx.spaceManager = new ctx.SpaceManager(planetParameters);
    ctx.initializeSpaceUI(ctx.spaceManager);

    const countAfter = container.querySelectorAll('.planet-option').length;
    expect(initialCount).toBe(Object.keys(planetParameters).length);
    expect(countAfter).toBe(initialCount);
  });
});

