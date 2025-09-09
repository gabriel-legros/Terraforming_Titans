const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { SolarPanel } = require('../src/js/buildings/solarPanel.js');

describe('SolarPanel build cap', () => {
  let config;
  beforeEach(() => {
    config = {
      name: 'Solar Panel Array',
      category: 'energy',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: true,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresDeposit: false,
      requiresWorker: 0,
      unlocked: true
    };
    global.resources = { colony: {}, surface: {}, underground: {} };
    global.terraforming = { initialLand: 2 };
  });

  test('does not exceed 10x initial land cap', () => {
    const panel = new SolarPanel(config, 'solarPanel');
    const result = panel.build(25);
    expect(result).toBe(true);
    expect(panel.count).toBe(20);
    expect(panel.build(1)).toBe(false);
    expect(panel.count).toBe(20);
  });
});
