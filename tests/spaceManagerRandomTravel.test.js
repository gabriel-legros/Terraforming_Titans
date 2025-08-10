const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager random world travel population tracking', () => {
  beforeEach(() => {
    global.resources = { colony: { colonists: { value: 0 } } };
    global.saveGameToSlot = jest.fn();
    global.initializeGameState = jest.fn();
    global.projectManager = { projects: { spaceStorage: { saveTravelState: jest.fn(() => null), loadTravelState: jest.fn() } } };
    global.updateProjectUI = jest.fn();
    global.updateSpaceUI = jest.fn();
  });

  test('records colonists when leaving worlds', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    resources.colony.colonists.value = 100;
    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(sm.planetStatuses.mars.colonists).toBe(100);
    resources.colony.colonists.value = 50;
    sm.travelToRandomWorld({ merged: { name: 'Beta' } }, '2');
    expect(sm.randomWorldStatuses['1'].colonists).toBe(50);
    expect(sm.getCurrentWorldName()).toBe('Beta');
  });
});

delete global.EffectableEntity;
