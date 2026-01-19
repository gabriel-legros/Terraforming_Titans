const { getDisplayConsumptionRates } = require('../src/js/resourceUI');

describe('lifters energy tooltip', () => {
  beforeEach(() => {
    global.buildings = {};
    global.projectManager = {
      projects: {
        lifters: {
          lastEnergyPerSecond: 120,
          lastDysonEnergyPerSecond: 20
        }
      }
    };
  });

  afterEach(() => {
    global.buildings = {};
    global.projectManager = null;
  });

  test('adds lifter colony energy usage to consumption display', () => {
    const resource = {
      category: 'colony',
      name: 'energy',
      consumptionRate: 10,
      consumptionRateBySource: { Housing: 10 }
    };

    const display = getDisplayConsumptionRates(resource);

    expect(display.total).toBeCloseTo(110);
    expect(display.bySource.Lifting).toBeCloseTo(100);
  });
});
