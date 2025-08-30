const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('pre-travel save preserves current world', () => {
  test('traveling to a random world saves the original world', () => {
    global.resources = { colony: { colonists: { value: 5 } } };
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.setRwgLock('mars', true);

    let saved = null;
    global.saveGameToSlot = (slot) => {
      if (slot === 'pretravel') {
        saved = JSON.parse(JSON.stringify(sm.saveState()));
      }
    };

    global.projectManager = { projects: { spaceStorage: { saveTravelState: () => null, loadTravelState: () => {} } } };
    global.initializeGameState = () => {};
    global.updateSpaceUI = () => {};

    const result = sm.travelToRandomWorld({ merged: { name: 'Alpha' } }, 123);
    expect(result).toBe(true);

    expect(saved.currentPlanetKey).toBe('mars');
    expect(saved.currentRandomSeed).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(saved.randomWorldStatuses, '123')).toBe(false);
    expect(sm.currentRandomSeed).toBe('123');
  });
});
