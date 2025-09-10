const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const numbers = require('../src/js/numbers.js');
const { planetParameters } = require('../src/js/planet-parameters.js');
const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
const spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'space.js'), 'utf8');

function loadScript(file, ctx){
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', file), 'utf8');
  vm.runInContext(code, ctx);
}

describe('travel warning popup', () => {
  test('requires confirmation before traveling', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="planet-selection-options"></div><div id="travel-status"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
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

    // enable vega2 for travel
    ctx.spaceManager.planetStatuses.vega2.enabled = true;
    ctx.spaceManager.updateCurrentPlanetTerraformedStatus(true);
    ctx.updateSpaceUI();

    // spy on changeCurrentPlanet
    ctx.spaceManager.changeCurrentPlanet = jest.fn(() => true);

    const btn = dom.window.document.querySelector('.select-planet-button[data-planet-key="vega2"]');
    btn.click();

    const popup = dom.window.document.getElementById('travel-warning-popup');
    expect(popup).not.toBeNull();
    const message = popup.querySelector('.travel-warning-message');
    expect(message.textContent).toBe(ctx.planetParameters.vega2.travelWarning);
    expect(ctx.spaceManager.changeCurrentPlanet).not.toHaveBeenCalled();

    popup.querySelector('#travel-warning-confirm').click();
    expect(ctx.spaceManager.changeCurrentPlanet).toHaveBeenCalledWith('vega2');
  });
});
