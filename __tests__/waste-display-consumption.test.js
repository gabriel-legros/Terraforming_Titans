const EffectableEntity = require('../src/js/effectable-entity');
const { getDisplayConsumptionRates } = require('../src/js/resourceUI');

describe('waste building display consumption', () => {
  let Building;

  beforeEach(() => {
    global.EffectableEntity = EffectableEntity;
    ({ Building } = require('../src/js/building'));
    global.populationModule = { getWorkerAvailabilityRatio: () => 1 };
  });

  afterEach(() => {
    global.buildings = {};
    global.resources = {};
    global.populationModule = null;
  });

  test('computes display productivity without waste input limits', () => {
    const building = new Building({
      name: 'Garbage Sorter',
      category: 'waste',
      description: '',
      cost: {},
      consumption: { colony: { energy: 10 }, surface: { garbage: 100 } },
      production: {},
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      snapProductivity: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
      displayConsumptionAtMaxProductivity: true,
      ignoreResourceForProductivityResourceDisplay: { surface: { garbage: true } }
    }, 'garbageSorter');

    building.active = 1;

    global.resources = {
      colony: {
        energy: { consumptionRate: 10, productionRate: 0, value: 6 }
      },
      surface: {
        garbage: { consumptionRate: 100, productionRate: 0, value: 20 }
      }
    };

    building.updateProductivity(global.resources, 1000);

    expect(building.productivity).toBeCloseTo(0.2);
    expect(building.displayProductivity).toBeCloseTo(0.6);
  });

  test('uses display productivity for flagged consumption displays', () => {
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
      displayConsumptionAtMaxProductivity: true,
      ignoreResourceForProductivityResourceDisplay: { surface: { garbage: true } }
    }, 'garbageSorter');

    building.active = 1;
    building.productivity = 0.2;
    building.displayProductivity = 0.6;

    global.buildings = { garbageSorter: building };

    const resource = {
      category: 'surface',
      name: 'garbage',
      consumptionRate: 20,
      consumptionRateBySource: { 'Garbage Sorter': 20 },
      productionRate: 0
    };

    const display = getDisplayConsumptionRates(resource);

    expect(display.total).toBeCloseTo(60);
    expect(display.bySource['Garbage Sorter']).toBeCloseTo(60);
  });

  test('uses display productivity for resource rate displays', () => {
    const building = new Building({
      name: 'Garbage Sorter',
      category: 'waste',
      description: '',
      cost: {},
      consumption: {},
      production: { surface: { trash: 1 } },
      storage: {},
      dayNightActivity: false,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresWorker: 0,
      maintenanceFactor: 1,
      unlocked: true,
      ignoreResourceForProductivityResourceDisplay: { surface: { garbage: true } }
    }, 'garbageSorter');

    const trashResource = { modifyRate: jest.fn() };
    global.resources = { surface: { trash: trashResource } };

    building.active = 1;
    building.productivity = 0.2;
    building.displayProductivity = 0.6;

    const accumulatedChanges = { surface: { trash: 0 } };
    building.produce(accumulatedChanges, 1000);

    expect(accumulatedChanges.surface.trash).toBeCloseTo(0.2);
    expect(trashResource.modifyRate).toHaveBeenCalledTimes(1);
    expect(trashResource.modifyRate.mock.calls[0][0]).toBeCloseTo(0.6);
    expect(trashResource.modifyRate.mock.calls[0][1]).toBe('Garbage Sorter');
    expect(trashResource.modifyRate.mock.calls[0][2]).toBe('building');
  });
});
