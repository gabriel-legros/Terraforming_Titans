const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');
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

  class MockResource extends EffectableEntity {
    constructor() {
      super({ description: 'mock' });
      this.value = 0;
      this.baseCap = 0;
      this.cap = 0;
      this.hasCap = true;
    }
    updateStorageCap() {
      const bonus = this.activeEffects
        .filter(e => e.type === 'baseStorageBonus')
        .reduce((s, e) => s + e.value, 0);
      this.cap = this.baseCap + bonus;
    }
    increase(v) {
      this.value = Math.min(this.value + v, this.cap);
    }
  }

  function makeResource() {
    const r = new MockResource();
    r.updateStorageCap();
    return r;
  }

  beforeEach(() => {
    global.structures = {};
    global.addEffect = (effect) => {
      const res = global.resources[effect.resourceType][effect.targetId];
      res.addAndReplace(effect);
    };
  });

  for (const key of Object.keys(amounts)) {
    test(`purchaseUpgrade("${key}") only increases storage`, () => {
      const resource = makeResource();
      global.resources = { colony: { [key]: resource } };
      const manager = new SolisManager();
      manager.solisPoints = 20; // sufficient
      expect(manager.purchaseUpgrade(key)).toBe(true);
      expect(resource.value).toBe(0);
      expect(resource.baseCap).toBe(0);
      expect(resource.cap).toBe(amounts[key]);
    });
  }

  test('reapplyEffects restores purchased resources', () => {
    const cols = {};
    for (const k of Object.keys(amounts)) {
      cols[k] = makeResource();
    }
    global.resources = { colony: cols };
    global.globalGameIsLoadingFromSave = false;
    const manager = new SolisManager();
    for (const k of Object.keys(amounts)) {
      manager.shopUpgrades[k].purchases =
        k === 'metal' ? 2 : k === 'water' ? 5 : 1;
    }
    manager.reapplyEffects();
    expect(cols.metal.value).toBe(2 * amounts.metal);
    expect(cols.metal.cap).toBe(2 * amounts.metal);
    expect(cols.water.value).toBe(5 * amounts.water);
    expect(cols.water.cap).toBe(5 * amounts.water);
    for (const k of Object.keys(amounts)) {
      if (k !== 'metal' && k !== 'water') {
        expect(cols[k].value).toBe(amounts[k]);
        expect(cols[k].cap).toBe(amounts[k]);
      }
    }
  });

  test('reapplyEffects does not grant resources when loading from save', () => {
    const cols = {};
    for (const k of Object.keys(amounts)) {
      cols[k] = makeResource();
    }
    global.resources = { colony: cols };
    global.globalGameIsLoadingFromSave = true;
    const manager = new SolisManager();
    for (const k of Object.keys(amounts)) {
      manager.shopUpgrades[k].purchases = 1;
    }
    manager.reapplyEffects();
    for (const k of Object.keys(amounts)) {
      expect(cols[k].value).toBe(0);
      expect(cols[k].cap).toBe(amounts[k]);
    }
    global.globalGameIsLoadingFromSave = false;
  });
});
