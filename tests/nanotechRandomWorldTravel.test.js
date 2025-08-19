const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('Random world travel preparation', () => {
  beforeEach(() => {
    global.resources = { colony: { colonists: { value: 0 } } };
    global.saveGameToSlot = jest.fn();
    global.initializeGameState = jest.fn();
    global.updateProjectUI = jest.fn();
    global.updateSpaceUI = jest.fn();
    global.projectManager = { projects: { spaceStorage: { saveTravelState: jest.fn(() => null), loadTravelState: jest.fn() } } };
    global.nanotechManager = { prepareForTravel: jest.fn() };
  });

  afterEach(() => {
    delete global.nanotechManager;
  });

  test('calls nanotech and project travel preparation', () => {
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, '1');
    expect(global.nanotechManager.prepareForTravel).toHaveBeenCalled();
    expect(global.projectManager.projects.spaceStorage.saveTravelState).toHaveBeenCalled();
  });
});

delete global.EffectableEntity;
