const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { OreMine } = require('../src/js/buildings/OreMine.js');

describe('OreMine.build', () => {
  let config;
  beforeEach(() => {
    config = {
      name: 'Ore Mine',
      category: 'resource',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: false,
      requiresMaintenance: false,
      requiresDeposit: false,
      requiresWorker: 0,
      unlocked: true
    };
    global.resources = { colony: {}, surface: {}, underground: {} };
  });

  test('registers mine with deeper mining project', () => {
    const registerMine = jest.fn();
    global.projectManager = { projects: { deeperMining: { registerMine } } };
    const oreMine = new OreMine(config, 'oreMine');
    const result = oreMine.build(1);
    expect(result).toBe(true);
    expect(registerMine).toHaveBeenCalled();
    expect(oreMine.count).toBe(1);
  });

  test('does not throw without deeper mining project', () => {
    global.projectManager = { projects: {} };
    const oreMine = new OreMine(config, 'oreMine');
    expect(() => oreMine.build(1)).not.toThrow();
    expect(oreMine.count).toBe(1);
  });
});
