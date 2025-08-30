const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('RWG solar luminosity persistence', () => {
  test('star luminosity restores after loading random world', () => {
    const sandbox = {
      console,
      EffectableEntity: require('../src/js/effectable-entity.js'),
    };

    sandbox.starLum = 1;
    sandbox.setStarLuminosity = m => { sandbox.starLum = m || 1; };
    sandbox.getStarLuminosity = () => sandbox.starLum;
    sandbox.document = {
      getElementById: () => ({ classList: { add() {}, remove() {} } }),
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ click() {}, classList: { add() {}, remove() {} } })
    };
    sandbox.tabManager = { activateTab: () => {}, resetVisibility: () => {} };
    sandbox.tabParameters = {};
    sandbox.resources = { colony: { colonists: { value: 0 } } };
    sandbox.saveGameToSlot = () => {};
    sandbox.projectManager = { projects: { spaceStorage: { saveTravelState: () => null, loadTravelState: () => {} } } };
    sandbox.initializeGameState = () => {
      sandbox.setStarLuminosity(sandbox.currentPlanetParameters?.celestialParameters?.starLuminosity || 1);
    };
    sandbox.updateProjectUI = () => {};
    sandbox.updateSpaceUI = () => {};
    sandbox.skillManager = null;
    sandbox.planetParameters = { mars: {} };
    sandbox.storyManager = null;
    sandbox.updateAllResearchButtons = () => {};
    sandbox.updateAdvancedResearchVisibility = () => {};
    sandbox.initializeResearchAlerts = () => {};
    sandbox.createBuildingButtons = () => {};
    sandbox.createColonyButtons = () => {};
    sandbox.updateBuildingDisplay = () => {};
    sandbox.createResourceDisplay = () => {};
    sandbox.createPopup = () => {};
    sandbox.initializeResearchUI = () => {};
    sandbox.initializeLifeUI = () => {};
    sandbox.createMilestonesUI = () => {};
    sandbox.updateDayNightDisplay = () => {};
    sandbox.initializeSpaceUI = () => {};
    sandbox.buildings = {};
    sandbox.colonies = {};
    sandbox.Math = Object.assign({}, Math, { random: () => 0.5 });
    sandbox.globalThis = sandbox;

    let spaceCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/space.js'), 'utf8');
    spaceCode += '\nthis.SpaceManager = SpaceManager;';
    vm.runInNewContext(spaceCode, sandbox, { filename: 'space.js' });
    let saveCode = fs.readFileSync(path.join(__dirname, '..', 'src/js/save.js'), 'utf8');
    saveCode += '\nthis.loadGame = loadGame;';
    vm.runInNewContext(saveCode, sandbox, { filename: 'save.js' });

    const sm = new sandbox.SpaceManager({ mars: { name: 'Mars' } });
    sandbox.spaceManager = sm;
    sm.setRwgLock('mars', true);
    sm.travelToRandomWorld({ merged: { name: 'Alpha', celestialParameters: { starLuminosity: 2 } }, star: { luminositySolar: 2 } }, '42');
    expect(sandbox.getStarLuminosity()).toBe(2);

    const saved = JSON.stringify({ spaceManager: sm.saveState() });
    sandbox.setStarLuminosity(1);
    sandbox.loadGame(saved);
    expect(sandbox.getStarLuminosity()).toBe(2);
  });
});
