const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager orbital ring counting', () => {
  test('orbital rings add to terraformed count', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.planetStatuses.titan.terraformed = true;
    sm.planetStatuses.titan.orbitalRing = true;
    global.projectManager = { projects: { orbitalRing: { ringCount: 1 } } };
    expect(sm.getUnmodifiedTerraformedWorldCount()).toBe(1);
    expect(sm.getTerraformedPlanetCount()).toBe(2);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(3);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(2);
    delete global.projectManager;
  });

  test('current world ring not counted in excluding method', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.planetStatuses.mars.terraformed = true;
    sm.planetStatuses.mars.orbitalRing = true;
    sm.currentPlanetKey = 'mars';
    global.projectManager = { projects: { orbitalRing: { ringCount: 1 } } };
    expect(sm.getTerraformedPlanetCount()).toBe(2);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(0);
    delete global.projectManager;
  });
});

delete global.EffectableEntity;
