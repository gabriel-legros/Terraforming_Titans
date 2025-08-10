const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('random world travel awards skill point', () => {
  beforeEach(() => {
    global.resources = { colony: { colonists: { value: 0 } } };
    global.saveGameToSlot = jest.fn();
    global.initializeGameState = jest.fn();
    global.projectManager = { projects: { spaceStorage: { saveTravelState: jest.fn(() => null), loadTravelState: jest.fn() } } };
    global.updateProjectUI = jest.fn();
    global.updateSpaceUI = jest.fn();
    global.skillManager = { skillPoints: 0 };
  });

  afterEach(() => {
    delete global.resources;
    delete global.saveGameToSlot;
    delete global.initializeGameState;
    delete global.projectManager;
    delete global.updateProjectUI;
    delete global.updateSpaceUI;
    delete global.skillManager;
  });

  test('grants one skill point on first visit from terraformed world', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.updateCurrentPlanetTerraformedStatus(true);
    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(skillManager.skillPoints).toBe(1);

    sm.updateCurrentPlanetTerraformedStatus(true);
    sm.travelToRandomWorld({ merged: { name: 'Beta' } }, '2');
    expect(skillManager.skillPoints).toBe(2);

    sm.updateCurrentPlanetTerraformedStatus(true);
    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(skillManager.skillPoints).toBe(2);
  });
});

delete global.EffectableEntity;
