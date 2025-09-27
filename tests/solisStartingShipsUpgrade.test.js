const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis starting ships upgrade', () => {
  let manager;

  beforeEach(() => {
    global.resources = {
      special: {
        spaceships: {
          value: 0,
          cap: Infinity,
          unlocked: false,
          increase(amount) {
            this.value += amount;
          },
          enable() {
            this.unlocked = true;
          }
        }
      },
      colony: {}
    };
    global.globalGameIsLoadingFromSave = false;
    manager = new SolisManager();
  });

  afterEach(() => {
    delete global.resources;
    delete global.globalGameIsLoadingFromSave;
  });

  test('purchase unlocks ships without immediately granting any and deducts Solis points', () => {
    manager.solisPoints = 150;
    expect(manager.getUpgradeCost('startingShips')).toBe(100);

    expect(manager.purchaseUpgrade('startingShips')).toBe(true);
    expect(manager.shopUpgrades.startingShips.purchases).toBe(1);
    expect(global.resources.special.spaceships.value).toBe(0);
    expect(global.resources.special.spaceships.unlocked).toBe(true);
    expect(manager.solisPoints).toBe(50);

    manager.solisPoints = 250;
    expect(manager.getUpgradeCost('startingShips')).toBe(200);

    expect(manager.purchaseUpgrade('startingShips')).toBe(true);
    expect(manager.shopUpgrades.startingShips.purchases).toBe(2);
    expect(global.resources.special.spaceships.value).toBe(0);
    expect(manager.solisPoints).toBe(50);
  });

  test('reapplyEffects grants purchased ships when rebuilding state', () => {
    manager.shopUpgrades.startingShips.purchases = 3;
    global.resources.special.spaceships.value = 0;

    manager.reapplyEffects();

    expect(global.resources.special.spaceships.value).toBe(3);
    expect(global.resources.special.spaceships.unlocked).toBe(true);
  });
});
