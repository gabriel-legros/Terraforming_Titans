const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager terraformed planet counting', () => {
  test('includes current planet only when not terraformed', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.planetStatuses.titan.terraformed = true;

    expect(sm.getTerraformedPlanetCount()).toBe(1);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(2);

    sm.planetStatuses.mars.terraformed = true;
    expect(sm.getTerraformedPlanetCount()).toBe(2);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(2);
  });
});

delete global.EffectableEntity;

