const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
global.addEffect = () => {};
global.buildings = {};

const { NanotechManager } = require('../src/js/nanotech.js');
const { Resource } = require('../src/js/resource.js');

describe('nanotech growth', () => {
  beforeEach(() => {
    const energy = new Resource({ name: 'energy', category: 'colony', initialValue: 0, hasCap: true, baseCap: 0 });
    const land = new Resource({ name: 'land', category: 'surface', initialValue: 1e9, hasCap: true, baseCap: 1e9 });
    global.resources = { colony: { energy }, surface: { land } };
  });

  test('grows at full rate when power available', () => {
    const manager = new NanotechManager();
    manager.growthSlider = 10; // 0.15% per second
    const dt = 1000;
    const requiredEnergy = manager.nanobots * 1e-11 * (dt / 1000);
    const accumulated = { colony: { energy: requiredEnergy } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBeCloseTo(1 * (1 + 0.0015));
  });

  test('growth scales with limited power', () => {
    const manager = new NanotechManager();
    manager.growthSlider = 10;
    const dt = 1000;
    const requiredEnergy = manager.nanobots * 1e-11 * (dt / 1000);
    const accumulated = { colony: { energy: requiredEnergy / 2 } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBeCloseTo(1 * (1 + 0.0015 * 0.5));
  });

  test('swarm capped by land area', () => {
    const manager = new NanotechManager();
    const land = global.resources.surface.land;
    land.value = 0;
    manager.nanobots = 5;
    const dt = 1000;
    const accumulated = { colony: { energy: 1 } };
    manager.produceResources(dt, accumulated);
    expect(manager.nanobots).toBe(0);
  });
});
