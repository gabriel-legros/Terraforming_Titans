const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager terraformed planet counting', () => {
  test('includes current planet only when not terraformed', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.planetStatuses.titan.terraformed = true;

    expect(sm.getTerraformedPlanetCount()).toBe(1);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(2);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(1);

    sm.planetStatuses.mars.terraformed = true;
    expect(sm.getTerraformedPlanetCount()).toBe(2);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(2);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(1);

    sm.currentPlanetKey = 'titan';
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(1);

    sm.currentPlanetKey = 'mars';
    sm.planetStatuses.titan.terraformed = false;
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(0);
  });

  test('counts terraformed random worlds', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.randomWorldStatuses['123'] = { terraformed: true, visited: true, colonists: 0, name: 'Seed 123' };

    expect(sm.getTerraformedPlanetCount()).toBe(1);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(2);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(1);

    sm.currentRandomSeed = '123';
    sm.currentPlanetKey = '123';
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(1);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(0);
  });

  test('super-earth adds extra terraformed world', () => {
    const sm = new SpaceManager({ mars: {}, titan: {} });
    sm.randomWorldStatuses['111'] = {
      terraformed: true,
      visited: true,
      colonists: 0,
      name: 'Seed 111',
      original: { archetype: 'super-earth', override: { classification: { archetype: 'super-earth' } } },
    };

    global.spaceManager = sm;
    global.addEffect = (eff) => {
      if (eff.target === 'spaceManager') sm.addAndReplace(eff);
    };
    const { applyRWGEffects } = require('../src/js/rwgEffects.js');
    applyRWGEffects();

    expect(sm.getTerraformedPlanetCount()).toBe(2);
    expect(sm.getTerraformedPlanetCountIncludingCurrent()).toBe(3);
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(2);

    sm.currentRandomSeed = '111';
    sm.currentPlanetKey = '111';
    expect(sm.getTerraformedPlanetCountExcludingCurrent()).toBe(0);

    delete global.spaceManager;
    delete global.addEffect;
  });
});

delete global.EffectableEntity;

