const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager random world travel population tracking', () => {
  beforeEach(() => {
    global.resources = { colony: { colonists: { value: 0 } } };
    global.terraforming = { initialLand: 100 };
    global.colonies = { t7_colony: { active: 0, requiresLand: 1 } };
    global.saveGameToSlot = jest.fn();
    global.initializeGameState = jest.fn();
    global.projectManager = { projects: { spaceStorage: { saveTravelState: jest.fn(() => null), loadTravelState: jest.fn() } } };
    global.updateProjectUI = jest.fn();
    global.updateSpaceUI = jest.fn();
  });

  afterEach(() => {
    delete global.terraforming;
    delete global.colonies;
  });

  test('records departure time and ecumenopolis coverage', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.setRwgLock('mars', true);
    resources.colony.colonists.value = 100;
    colonies.t7_colony.active = 5;
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(sm.planetStatuses.mars.colonists).toBe(100);
    expect(sm.planetStatuses.mars.departedAt).toBe(1000);
    expect(sm.planetStatuses.mars.ecumenopolisPercent).toBeCloseTo(5);
    resources.colony.colonists.value = 50;
    colonies.t7_colony.active = 10;
    Date.now.mockReturnValue(2000);
    sm.travelToRandomWorld({ merged: { name: 'Beta' } }, '2');
    expect(sm.randomWorldStatuses['1'].colonists).toBe(50);
    expect(sm.randomWorldStatuses['1'].departedAt).toBe(2000);
    expect(sm.randomWorldStatuses['1'].ecumenopolisPercent).toBeCloseTo(10);
    expect(sm.getCurrentWorldName()).toBe('Beta');
    Date.now.mockRestore();
  });
});

delete global.EffectableEntity;
