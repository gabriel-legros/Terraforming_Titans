const EffectableEntity = require('../src/js/effectable-entity');
const { getDisplayConsumptionRates } = require('../src/js/resourceUI');

describe('waste building display consumption', () => {
  let Building;

  beforeEach(() => {
    global.EffectableEntity = EffectableEntity;
    ({ Building } = require('../src/js/building'));
  });

  afterEach(() => {
    global.buildings = {};
  });

  test('shows max productivity consumption for flagged buildings', () => {
    const building = new Building({
      name: 'Garbage Sorter',
      category: 'waste',
      description: '',
      cost: {},
      consumption: { surface: { garbage: 100 } },
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
      displayConsumptionAtMaxProductivity: true
    }, 'garbageSorter');

    building.active = 1;
    building.productivity = 0.5;

    global.buildings = { garbageSorter: building };

    const resource = {
      category: 'surface',
      name: 'garbage',
      consumptionRate: 50,
      consumptionRateBySource: { 'Garbage Sorter': 50 },
      productionRate: 0
    };

    const display = getDisplayConsumptionRates(resource);

    expect(display.total).toBe(100);
    expect(display.bySource['Garbage Sorter']).toBe(100);
  });
});
