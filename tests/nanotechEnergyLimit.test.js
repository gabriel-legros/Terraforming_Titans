const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Resource } = require('../src/js/resource.js');
const { NanotechManager } = require('../src/js/nanotech.js');

describe('nanotech energy usage limit', () => {
  test('swarm consumption capped by energy percent', () => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 1000, hasCap: true, baseCap: 1e9 });
    const silicon = new Resource({ name: 'silicon', category: 'colony', initialValue: 0 });
    const glass = new Resource({ name: 'glass', category: 'colony', initialValue: 0 });
    energy.modifyRate(1000, 'Generator', 'building');
    global.resources = { colony: { energy, silicon, glass } };
    global.structures = {};
    const nm = new NanotechManager();
    nm.enabled = true;
    nm.nanobots = 1e15; // requires 1000 W
    nm.maxEnergyPercent = 10; // 10%
    nm.growthSlider = 10;
    const acc = { colony: { energy: 0, silicon: 0, glass: 0 } };
    nm.produceResources(1000, acc);
    expect(nm.currentEnergyConsumption).toBeCloseTo(100, 5);
    expect(acc.colony.energy).toBeCloseTo(-100);
    expect(energy.consumptionRate).toBeCloseTo(100);
  });
});
