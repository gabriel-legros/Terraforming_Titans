const colonyIds = ['aerostat_colony', 't1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony', 't7_colony'];

describe('Warpnet slider energy scaling', () => {
  let ColonySlidersManager;
  let addEffectMock;

  beforeEach(() => {
    jest.resetModules();
    addEffectMock = jest.fn();
    global.addEffect = addEffectMock;
    global.EffectableEntity = class {
      constructor() {
        this.booleanFlags = new Set();
      }

      addEffect() {}
      addAndReplace() {}
      removeEffect() {}
      applyEffect() {}
      applyBooleanFlag(effect) {
        if (effect.value) {
          this.booleanFlags.add(effect.flagId);
        } else {
          this.booleanFlags.delete(effect.flagId);
        }
      }
      applyActiveEffects() {}
      isBooleanFlagSet(flag) {
        return this.booleanFlags.has(flag);
      }
    };

    ({ ColonySlidersManager } = require('../src/js/colonySliders.js'));
  });

  afterEach(() => {
    delete global.addEffect;
    delete global.EffectableEntity;
  });

  test('energy consumption multiplies exponentially with warpnet level', () => {
    const manager = new ColonySlidersManager();
    manager.setWarpnetLevel(3);

    const energyMultiplier = Math.pow(10, 3);

    expect(addEffectMock).toHaveBeenCalledWith(expect.objectContaining({
      target: 'global',
      type: 'globalResearchBoost',
      value: 3,
      effectId: 'warpnetResearchBoost'
    }));

    colonyIds.forEach(colonyId => {
      expect(addEffectMock).toHaveBeenCalledWith(expect.objectContaining({
        target: 'colony',
        targetId: colonyId,
        resourceCategory: 'colony',
        resourceTarget: 'energy',
        value: energyMultiplier,
        effectId: 'warpnetEnergyConsumption'
      }));
    });
  });
});
