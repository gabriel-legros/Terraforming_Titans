const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis resource delivery on planet travel', () => {
  test('resources are granted only on first visit to a planet', () => {
    let currentPlanet = 'mars';
    global.spaceManager = { getCurrentPlanetKey: () => currentPlanet };

    // resources for mars
    const marsRes = { colony: { metal: { value: 0, increase(v){ this.value += v; } } } };
    global.resources = marsRes;

    const manager = new SolisManager();
    manager.solisPoints = 5;
    expect(manager.purchaseUpgrade('metal')).toBe(true);
    expect(marsRes.colony.metal.value).toBe(100);

    // travel to titan
    currentPlanet = 'titan';
    const titanRes = { colony: { metal: { value: 0, increase(v){ this.value += v; } } } };
    global.resources = titanRes;
    manager.reapplyEffects();
    expect(titanRes.colony.metal.value).toBe(100);

    // reapply should not grant again
    manager.reapplyEffects();
    expect(titanRes.colony.metal.value).toBe(100);

    // travel back to mars, ensure no extra gain
    currentPlanet = 'mars';
    global.resources = marsRes;
    manager.reapplyEffects();
    expect(marsRes.colony.metal.value).toBe(100);
  });
});
