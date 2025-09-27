const { generateRandomPlanet } = require('../src/js/rwg.js');

global.EffectableEntity = class {};
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager auto seed migration', () => {
  test('replaces auto seeds with canonical seed', () => {
    const canonical = generateRandomPlanet('auto').seedString;
    const original = { name: 'AutoWorld', visited: true };
    const saved = { randomWorldStatuses: { auto: { ...original } } };
    const sm = new SpaceManager({ mars: { name: 'Mars' } });
    sm.loadState(saved);
    expect(sm.randomWorldStatuses[canonical]).toEqual(original);
    expect(sm.randomWorldStatuses.auto).toBeUndefined();
  });
});

afterAll(() => {
  delete global.EffectableEntity;
});
