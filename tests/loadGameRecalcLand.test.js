global.document = { addEventListener: () => {}, getElementById: () => ({ textContent: '' }) };
const { loadGame } = require('../src/js/save.js');

describe('loadGame recalculates land usage', () => {
  beforeEach(() => {
    global.createBuildingButtons = () => {};
    global.initializeBuildingAlerts = () => {};
    global.createColonyButtons = () => {};
    global.tabManager = { activateTab: () => {} };
    global.updateDayNightDisplay = () => {};
    global.updateBuildingDisplay = () => {};
    global.updateResourceDisplay = () => {};
    global.applyDayNightSettingEffects = () => {};
    global.currentPlanetParameters = { resources: { surface: { land: {} } } };
  });

  test('reserved land derives from active structures', () => {
    global.resources = { surface: { land: { value: 100, reserved: 0, initializeFromConfig: () => {} } } };
    global.buildings = { hut: { requiresLand: 3, active: 0, initializeFromConfig: () => {}, activeEffects: [], booleanFlags: [] } };
    global.colonies = { base: { requiresLand: 5, active: 0, initializeFromConfig: () => {}, activeEffects: [], booleanFlags: [] } };
    global.buildingsParameters = { hut: { requiresLand: 3 } };
    global.colonyParameters = { base: { requiresLand: 5 } };

    const saved = JSON.stringify({
      resources: { surface: { land: { value: 100, reserved: 0 } } },
      buildings: { hut: { active: 2 } },
      colonies: { base: { active: 1 } }
    });

    loadGame(saved);
    expect(resources.surface.land.reserved).toBe(2 * 3 + 1 * 5);
  });
});
