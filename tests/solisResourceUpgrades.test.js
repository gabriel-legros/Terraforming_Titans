const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { SolisManager } = require('../src/js/solis.js');

describe('Solis resource upgrades', () => {
  const amounts = {
    metal: 100,
    components: 100,
    electronics: 100,
    glass: 100,
    water: 1000000,
    androids: 100,
    food: 100
  };

  for (const key of Object.keys(amounts)) {
    test(`purchaseUpgrade("${key}") increases resource`, () => {
      const resource = { value: 0, increase(v) { this.value += v; } };
      global.resources = { colony: { [key]: resource } };
      const manager = new SolisManager();
      manager.solisPoints = 20; // sufficient
      expect(manager.purchaseUpgrade(key)).toBe(true);
      expect(resource.value).toBe(amounts[key]);
    });
  }

  test('reapplyEffects restores purchased resources', () => {
    const cols = {};
    for (const k of Object.keys(amounts)) {
      cols[k] = { value: 0, increase(v){ this.value += v; } };
    }
    global.resources = { colony: cols };
    const manager = new SolisManager();
    for (const k of Object.keys(amounts)) {
      manager.shopUpgrades[k].purchases = k === 'metal' ? 2 : 1;
    }
    manager.reapplyEffects();
    expect(cols.metal.value).toBe(2 * amounts.metal);
    for (const k of Object.keys(amounts)) {
      if (k !== 'metal') expect(cols[k].value).toBe(amounts[k]);
    }
  });
});
