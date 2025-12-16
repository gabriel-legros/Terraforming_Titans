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

describe('SolisManager Clock Manipulation Detection', () => {
  let solisManager;
  let mockResources;

  beforeEach(() => {
    // Mock resources
    mockResources = {
      colony: {
        metal: { unlocked: true, value: 10000, decrease: jest.fn() },
        food: { unlocked: true, value: 5000, decrease: jest.fn() },
        components: { unlocked: true, value: 3000, decrease: jest.fn() }
      }
    };
    global.resources = mockResources;

    solisManager = new SolisManager();
    solisManager.enabled = true;
  });

  afterEach(() => {
    delete global.resources;
  });

  test('should detect and fix excessive cooldown from clock manipulation', () => {
    const now = Date.now();
    
    // Simulate completing a quest
    solisManager.currentQuest = { resource: 'metal', quantity: 100, value: 1000 };
    solisManager.completeQuest();
    
    // Verify cooldown was set normally
    expect(solisManager.postCompletionCooldownUntil).toBeGreaterThan(now);
    expect(solisManager.postCompletionCooldownUntil).toBeLessThanOrEqual(now + solisManager.questInterval + 1000);
    
    // Simulate clock being set backward by manipulating the cooldown
    // This would happen if the player completed a quest, then changed their clock back
    const futureTime = now + (60 * 60 * 1000); // 1 hour in the future
    solisManager.postCompletionCooldownUntil = futureTime;
    solisManager.lastQuestTime = futureTime - solisManager.questInterval;
    
    // Run update - should detect the excessive wait time
    solisManager.update(1);
    
    // Verify the cooldown was reset to a reasonable time
    const afterUpdate = Date.now();
    expect(solisManager.postCompletionCooldownUntil).toBeGreaterThan(afterUpdate);
    expect(solisManager.postCompletionCooldownUntil).toBeLessThanOrEqual(afterUpdate + solisManager.questInterval + 1000);
  });

  test('should not reset normal cooldowns', () => {
    const now = Date.now();
    
    // Set a normal cooldown
    solisManager.postCompletionCooldownUntil = now + solisManager.questInterval;
    solisManager.lastQuestTime = now;
    solisManager.lastRefreshTime = now;
    
    const originalCooldown = solisManager.postCompletionCooldownUntil;
    
    // Run update
    solisManager.update(1);
    
    // Verify cooldown was not changed
    expect(solisManager.postCompletionCooldownUntil).toBe(originalCooldown);
  });

  test('should detect and fix excessive refresh cooldown', () => {
    const now = Date.now();
    
    // Simulate excessive refresh time (clock manipulation)
    const futureTime = now + (60 * 60 * 1000); // 1 hour in the future
    solisManager.lastRefreshTime = futureTime;
    
    // Run update
    solisManager.update(1);
    
    // Verify refresh time was reset
    const afterUpdate = Date.now();
    expect(solisManager.lastRefreshTime).toBeGreaterThanOrEqual(afterUpdate - 1000);
    expect(solisManager.lastRefreshTime).toBeLessThanOrEqual(afterUpdate + 1000);
  });

  test('should allow cooldowns up to 2x the normal interval', () => {
    const now = Date.now();
    
    // Set cooldown to exactly 2x the interval (should be allowed)
    const allowedCooldown = now + (solisManager.questInterval * 2);
    solisManager.postCompletionCooldownUntil = allowedCooldown;
    solisManager.lastQuestTime = now;
    
    // Run update
    solisManager.update(1);
    
    // Verify cooldown was not changed (it's within the allowed range)
    expect(solisManager.postCompletionCooldownUntil).toBe(allowedCooldown);
  });

  test('should reset cooldowns just over 2x the interval', () => {
    const now = Date.now();
    
    // Set cooldown to just over 2x the interval (should be reset)
    const excessiveCooldown = now + (solisManager.questInterval * 2) + 1000;
    solisManager.postCompletionCooldownUntil = excessiveCooldown;
    solisManager.lastQuestTime = now;
    
    // Run update
    solisManager.update(1);
    
    // Verify cooldown was reset
    const afterUpdate = Date.now();
    expect(solisManager.postCompletionCooldownUntil).toBeLessThan(excessiveCooldown);
    expect(solisManager.postCompletionCooldownUntil).toBeGreaterThan(afterUpdate);
    expect(solisManager.postCompletionCooldownUntil).toBeLessThanOrEqual(afterUpdate + solisManager.questInterval + 1000);
  });

  test('should generate quest after cooldown is corrected', () => {
    const now = Date.now();
    
    // Set excessive cooldown
    solisManager.postCompletionCooldownUntil = now + (60 * 60 * 1000);
    solisManager.currentQuest = null;
    
    // Run update - should correct the cooldown
    solisManager.update(1);
    
    // Verify cooldown was corrected
    expect(solisManager.postCompletionCooldownUntil).toBeLessThan(now + (60 * 60 * 1000));
    
    // Fast forward past the corrected cooldown
    const correctedCooldown = solisManager.postCompletionCooldownUntil;
    solisManager.postCompletionCooldownUntil = now - 1000; // Set to past
    
    // Run update again - should generate a quest
    solisManager.update(1);
    
    // Verify quest was generated
    expect(solisManager.currentQuest).not.toBeNull();
    expect(solisManager.currentQuest.resource).toBeDefined();
    expect(solisManager.currentQuest.quantity).toBeGreaterThan(0);
  });
});