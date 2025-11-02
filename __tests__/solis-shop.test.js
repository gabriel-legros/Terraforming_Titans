const { describe, beforeEach, afterEach, test, expect } = global;

describe('SolisManager automation upgrades', () => {
  let SolisManager;
  let addEffectMock;

  beforeEach(() => {
    jest.resetModules();
    addEffectMock = jest.fn();
    global.addEffect = addEffectMock;
    global.researchManager = {};
    global.resources = { colony: {}, special: {} };
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

    ({ SolisManager } = require('../src/js/solis.js'));
  });

  test('solisAutoResearch flag toggles automation shop availability', () => {
    const manager = new SolisManager();

    manager.applyBooleanFlag({ flagId: 'solisAutoResearch', value: true });
    expect(manager.isUpgradeEnabled('autoResearch')).toBe(true);

    manager.applyBooleanFlag({ flagId: 'solisAutoResearch', value: false });
    expect(manager.isUpgradeEnabled('autoResearch')).toBe(false);
  });

  afterEach(() => {
    delete global.addEffect;
    delete global.researchManager;
    delete global.EffectableEntity;
    delete global.resources;
  });

  test('autoResearch upgrade starts disabled and cannot be purchased', () => {
    const manager = new SolisManager();
    manager.solisPoints = 2000;

    expect(manager.isUpgradeEnabled('autoResearch')).toBe(false);
    expect(manager.getUpgradeCost('autoResearch')).toBe(0);
    expect(manager.purchaseUpgrade('autoResearch')).toBe(false);
    expect(manager.shopUpgrades.autoResearch.purchases).toBe(0);
    expect(addEffectMock).not.toHaveBeenCalled();
  });

  test('autoResearch upgrade can be enabled, purchased, and applies its effect', () => {
    const manager = new SolisManager();
    manager.setUpgradeEnabled('autoResearch', true);
    manager.solisPoints = 1500;

    expect(manager.getUpgradeCost('autoResearch')).toBe(1000);
    expect(manager.purchaseUpgrade('autoResearch')).toBe(true);
    expect(manager.solisPoints).toBe(500);
    expect(manager.shopUpgrades.autoResearch.purchases).toBe(1);
    expect(addEffectMock).toHaveBeenCalledWith(expect.objectContaining({
      target: 'researchManager',
      type: 'booleanFlag',
      flagId: 'autoResearchEnabled',
      value: true,
      effectId: 'solisAutoResearch',
      sourceId: 'solisShop'
    }));
  });

  test('autoResearch enabled state persists through save and load', () => {
    const manager = new SolisManager();
    manager.setUpgradeEnabled('autoResearch', true);
    const save = manager.saveState();

    const restored = new SolisManager();
    restored.loadState(save);

    expect(restored.isUpgradeEnabled('autoResearch')).toBe(true);
  });

  test('reapplyEffects reapplies autoResearch flag when purchased', () => {
    const manager = new SolisManager();
    manager.shopUpgrades.autoResearch.purchases = 1;

    manager.reapplyEffects();

    expect(addEffectMock).toHaveBeenCalledWith(expect.objectContaining({
      effectId: 'solisAutoResearch',
      flagId: 'autoResearchEnabled',
      target: 'researchManager'
    }));
  });
});
