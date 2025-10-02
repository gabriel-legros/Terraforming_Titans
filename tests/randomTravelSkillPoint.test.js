const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('random world travel skill points', () => {
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

  test('awards a skill point when leaving a terraformed world for a random world', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.setRwgLock('mars', true);
    sm.updateCurrentPlanetTerraformedStatus(true);

    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(skillManager.skillPoints).toBe(1);

    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(skillManager.skillPoints).toBe(1);

    sm.updateCurrentPlanetTerraformedStatus(true);
    sm.travelToRandomWorld({ merged: { name: 'Beta' } }, '2');
    expect(skillManager.skillPoints).toBe(2);
  });
});

delete global.EffectableEntity;
