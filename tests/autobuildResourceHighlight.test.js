const { autoBuild, constructionOfficeState } = require('../src/js/autobuild.js');
const EffectableEntity = require('../src/js/effectable-entity.js');

global.EffectableEntity = EffectableEntity;
global.maintenanceFraction = 0;
const { Building } = require('../src/js/building.js');

describe('autobuild resource highlight', () => {
  beforeEach(() => {
    constructionOfficeState.strategicReserve = 0;
    constructionOfficeState.autobuilderActive = true;
  });

  test('marks target when resources are insufficient', () => {
    const config = {
      name: 'Test',
      category: 'colony',
      cost: { colony: { metal: 10 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: {},
      canBeToggled: false,
      maintenanceFactor: 1,
      requiresMaintenance: false,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
    };

    const building = new Building(config, 'test');
    building.autoBuildEnabled = true;
    building.autoBuildPercent = 1;

    global.resources = {
      colony: {
        colonists: { value: 100 },
        workers: { cap: 0 },
        metal: {
          value: 0,
          cap: 100,
          decrease(amount) {
            this.value -= amount;
          },
        },
      },
      surface: {},
      underground: {},
    };

    autoBuild({ Test: building });
    expect(building.count).toBe(0);
    expect(building.autoBuildResourceBlocked).toBe(true);

    resources.colony.metal.value = 20;
    autoBuild({ Test: building });
    expect(building.count).toBe(1);
    expect(building.autoBuildResourceBlocked).toBe(false);
  });

  test('does not mark target when blocked by deposits', () => {
    const config = {
      name: 'Mine',
      category: 'resource',
      cost: { colony: { metal: 5 } },
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: {},
      canBeToggled: false,
      maintenanceFactor: 1,
      requiresMaintenance: false,
      requiresDeposit: { underground: { ore: 1 } },
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
    };

    const building = new Building(config, 'mine');
    building.autoBuildEnabled = true;
    building.autoBuildPercent = 1;

    global.resources = {
      colony: {
        colonists: { value: 100 },
        workers: { cap: 0 },
        metal: {
          value: 100,
          cap: 100,
          decrease(amount) {
            this.value -= amount;
          },
        },
      },
      surface: {},
      underground: {
        ore: {
          value: 0,
          reserved: 0,
          reserve(amount) {
            this.reserved += amount;
          },
          release(amount) {
            this.reserved -= amount;
          },
        },
      },
    };

    autoBuild({ Mine: building });
    expect(building.count).toBe(0);
    expect(building.autoBuildResourceBlocked).toBe(false);
  });
});
