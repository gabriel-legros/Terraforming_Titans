require('../src/js/effectable-entity.js');
const { LifeManager } = require('../src/js/life.js');

describe('Engineered Nitrogen Fixation', () => {
  beforeEach(() => {
    global.terraforming = {
      atmosphericPressureCache: {
        pressureByKey: {
          inertGas: 0,
        },
      },
    };
  });

  afterEach(() => {
    delete global.terraforming;
  });

  it('scales growth linearly with nitrogen pressure when enabled', () => {
    const manager = new LifeManager();
    manager.addAndReplace({
      type: 'booleanFlag',
      flagId: 'engineeredNitrogenFixation',
      value: true,
    });

    terraforming.atmosphericPressureCache.pressureByKey.inertGas = 0;
    expect(manager.getLifeGrowthMultiplierBreakdown().nitrogenMultiplier).toBeCloseTo(1, 5);

    terraforming.atmosphericPressureCache.pressureByKey.inertGas = 5000;
    expect(manager.getLifeGrowthMultiplierBreakdown().nitrogenMultiplier).toBeCloseTo(1.5, 5);

    terraforming.atmosphericPressureCache.pressureByKey.inertGas = 10000;
    expect(manager.getLifeGrowthMultiplierBreakdown().nitrogenMultiplier).toBeCloseTo(2, 5);
  });

  it('ignores nitrogen pressure without the flag', () => {
    const manager = new LifeManager();
    terraforming.atmosphericPressureCache.pressureByKey.inertGas = 10000;
    expect(manager.getLifeGrowthMultiplierBreakdown().nitrogenMultiplier).toBeCloseTo(1, 5);
  });
});
