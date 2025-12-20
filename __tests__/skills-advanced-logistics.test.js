const { SkillManager } = require('../src/js/skills');
const skillParameters = require('../src/js/skills-parameters');
const EffectableEntity = require('../src/js/effectable-entity');

describe('Advanced Logistics skill effects', () => {
  beforeEach(() => {
    global.addEffect = jest.fn();
  });

  afterEach(() => {
    delete global.addEffect;
  });

  test('applies ship efficiency and trade saturation effects per rank', () => {
    const manager = new SkillManager(skillParameters);

    manager.unlockSkill('ship_efficiency');

    expect(global.addEffect).toHaveBeenCalledTimes(3);

    const effects = global.addEffect.mock.calls.map(([effect]) => effect);
    const shipEffect = effects.find((effect) => effect.type === 'shipEfficiency');
    const saturationEffects = effects.filter((effect) => effect.type === 'tradeSaturationMultiplier');

    expect(shipEffect.value).toBeCloseTo(0.2);
    expect(saturationEffects).toHaveLength(2);
    expect(saturationEffects.map((effect) => effect.targetId).sort()).toEqual(['exportResources', 'galactic_market']);
    saturationEffects.forEach((effect) => {
      expect(effect.value).toBeCloseTo(0.2);
    });

    global.addEffect.mockClear();
    manager.upgradeSkill('ship_efficiency');

    const upgradedEffects = global.addEffect.mock.calls.map(([effect]) => effect);
    const upgradedShip = upgradedEffects.find((effect) => effect.type === 'shipEfficiency');
    const upgradedSaturation = upgradedEffects.filter((effect) => effect.type === 'tradeSaturationMultiplier');

    expect(upgradedShip.value).toBeCloseTo(0.4);
    expect(upgradedSaturation).toHaveLength(2);
    upgradedSaturation.forEach((effect) => {
      expect(effect.value).toBeCloseTo(0.4);
    });
  });
});

describe('trade saturation multiplier effect', () => {
  beforeEach(() => {
    global.globalGameIsLoadingFromSave = false;
  });

  afterEach(() => {
    delete global.globalGameIsLoadingFromSave;
  });

  test('updates trade saturation multiplier on effect', () => {
    const entity = new EffectableEntity({ description: 'Test Entity' });
    entity.applyEffect({ type: 'tradeSaturationMultiplier', value: 0.2 });

    expect(entity.tradeSaturationMultiplier).toBeCloseTo(1.2);
  });
});
