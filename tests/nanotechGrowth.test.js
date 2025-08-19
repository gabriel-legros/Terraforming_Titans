const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { NanotechManager } = require('../src/js/nanotech.js');
const { Resource } = require('../src/js/resource.js');

describe('nanotech growth', () => {
  beforeEach(() => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0, hasCap: true, baseCap: 0 });
    const silicon = new Resource({ name: 'silicon', category: 'colony', initialValue: 0, hasCap: true, baseCap: 1 });
    const glass = new Resource({ name: 'glass', category: 'colony', initialValue: 0, hasCap: true, baseCap: 1 });
    const land = new Resource({ name: 'land', category: 'surface', initialValue: 1e9, hasCap: true, baseCap: 1e9 });
    global.resources = { colony: { energy, silicon, glass }, surface: { land } };
    global.addEffect = jest.fn();
    global.removeEffect = jest.fn();
    global.structures = {};
    global.buildings = {};
    global.colonies = {};
  });

  test('grows at full rate when power available', () => {
    const manager = new NanotechManager();
    manager.enable();
    manager.growthSlider = 10; // 0.15% per second
    const dt = 1000;
    const requiredEnergy = manager.nanobots * 1e-11 * (dt / 1000);
    const accumulated = { colony: { energy: requiredEnergy } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBeCloseTo(1 * (1 + 0.0015));
    expect(global.resources.colony.energy.consumptionRate).toBeCloseTo(1e-11);
  });

  test('growth scales with limited power', () => {
    const manager = new NanotechManager();
    manager.enable();
    manager.growthSlider = 10;
    const dt = 1000;
    const requiredEnergy = manager.nanobots * 1e-11 * (dt / 1000);
    const accumulated = { colony: { energy: requiredEnergy / 2 } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBeCloseTo(1 * (1 + 0.0015 * 0.5));
  });

  test('swarm capped by land area', () => {
    const manager = new NanotechManager();
    manager.enable();
    const land = global.resources.surface.land;
    land.value = 0;
    manager.nanobots = 5;
    const dt = 1000;
    const accumulated = { colony: { energy: 1 } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBe(0);
  });

  test('tracks silicon use and glass production', () => {
    const manager = new NanotechManager();
    manager.enable();
    manager.siliconSlider = 10;
    manager.glassSlider = 10;
    const dt = 1000;
    const accumulated = { colony: { energy: 0, silicon: 0, glass: 0 } };
    manager.produceResources(dt, accumulated);
    expect(accumulated.colony.silicon).toBeCloseTo(-1e-20);
    expect(accumulated.colony.glass).toBeCloseTo(1e-20);
    expect(global.resources.colony.silicon.consumptionRate).toBeCloseTo(1e-20);
    expect(global.resources.colony.glass.productionRate).toBeCloseTo(1e-20);
  });

  test('maintenance slider applies up to 50% reduction', () => {
    const manager = new NanotechManager();
    manager.enable();
    manager.maintenanceSlider = 10;
    global.structures = {
      b1: { maintenanceCost: { metal: 1e-20 }, active: 1, productivity: 1 },
    };
    manager.produceResources(1000, { colony: { energy: 0 } });
    const call = global.addEffect.mock.calls.find((c) => c[0].targetId === 'b1' && c[0].resourceId === 'metal');
    expect(call[0].value).toBeCloseTo(0.5);
  });
});
