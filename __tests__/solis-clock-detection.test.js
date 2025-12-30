// Mock EffectableEntity before requiring SolisManager
global.EffectableEntity = class EffectableEntity {
  constructor() {
    this.effects = [];
    this.booleanFlags = {};
  }
  
  applyBooleanFlag(effect) {
    if (effect && effect.flagId) {
      this.booleanFlags[effect.flagId] = effect.value;
    }
  }
  
  isBooleanFlagSet(flagId) {
    return this.booleanFlags[flagId] || false;
  }
};

const { SolisManager } = require('../src/js/solis.js');

describe('SolisManager quest timers', () => {
  let solisManager;
  let mockResources;

  beforeEach(() => {
    mockResources = {
      colony: {
        metal: { unlocked: true, value: 10000, decrease: jest.fn() }
      }
    };
    global.resources = mockResources;

    solisManager = new SolisManager();
    solisManager.enabled = true;
  });

  afterEach(() => {
    delete global.resources;
  });

  test('counts down quest cooldown using delta time', () => {
    solisManager.currentQuest = null;
    solisManager.questCooldownRemaining = 2000;
    solisManager.hasGeneratedQuest = true;

    solisManager.update(1000);

    expect(solisManager.questCooldownRemaining).toBe(1000);
    expect(solisManager.currentQuest).toBeNull();

    solisManager.update(1000);

    expect(solisManager.questCooldownRemaining).toBe(0);
    expect(solisManager.currentQuest).not.toBeNull();
  });

  test('does not tick cooldowns when delta is zero', () => {
    solisManager.questCooldownRemaining = 1500;
    solisManager.refreshCooldownRemaining = 500;
    solisManager.hasGeneratedQuest = true;

    solisManager.update(0);

    expect(solisManager.questCooldownRemaining).toBe(1500);
    expect(solisManager.refreshCooldownRemaining).toBe(500);
  });

  test('refresh cooldown blocks refresh until elapsed', () => {
    solisManager.currentQuest = { resource: 'metal', quantity: 100, value: 1000 };
    solisManager.refreshCooldownRemaining = 1000;
    solisManager.questCooldownRemaining = 0;

    const originalQuest = solisManager.currentQuest;
    solisManager.refreshQuest();

    expect(solisManager.currentQuest).toBe(originalQuest);

    solisManager.update(1000);
    solisManager.refreshQuest();

    expect(solisManager.currentQuest).not.toBe(originalQuest);
    expect(solisManager.refreshCooldownRemaining).toBe(solisManager.refreshCooldown);
  });
});
