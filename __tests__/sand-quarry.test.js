const sandQuarryConfig = {
  name: 'Sand Quarry',
  category: 'resource',
  description: 'Digs through regolith to extract silicon.',
  cost: { colony: { metal: 50, components: 5 } },
  consumption: { colony: { energy: 50000 } },
  production: { colony: { silicon: 1 } },
  storage: {},
  dayNightActivity: false,
  canBeToggled: true,
  requiresMaintenance: true,
  requiresWorker: 0,
  maintenanceFactor: 1,
  automationBuildingsDropDown: ['glassSmelter'],
  unlocked: false,
};

describe('SandQuarry build limits on sandless planets', () => {
  let SandQuarry;

  const createResource = (value, cap) => ({
    value,
    cap,
    reserved: 0,
    maintenanceMultiplier: 1,
    updateStorageCap: jest.fn(),
  });

  beforeAll(() => {
    global.EffectableEntity = class EffectableEntity {
      constructor(config = {}) {
        Object.assign(this, config);
        this.booleanFlags = new Set();
        this.activeEffects = [];
      }
      getEffectiveCostMultiplier() { return 1; }
      getEffectiveConsumptionMultiplier() { return 1; }
      getEffectiveResourceConsumptionMultiplier() { return 1; }
      getEffectiveMaintenanceMultiplier() { return 1; }
      getEffectiveMaintenanceCostMultiplier() { return 1; }
      getEffectiveStorageMultiplier() { return 1; }
      getEffectiveProductionMultiplier() { return 1; }
      getProductionResourceMultiplier() { return 1; }
      hasBooleanFlag() { return false; }
    };

    global.resources = {};
    global.dayNightCycle = { isDay: () => true };
    global.buildings = {};
    global.maintenanceFraction = 0.001;

    const { Building } = require('../src/js/building.js');
    global.Building = Building;

    SandQuarry = require('../src/js/buildings/SandQuarry.js').SandQuarry;
  });

  beforeEach(() => {
    global.resources = {
      colony: {
        metal: createResource(120, 120),
        components: createResource(15, 15),
        energy: createResource(500000, 500000),
        silicon: createResource(0, 0),
      },
      underground: {},
      surface: {
        land: {
          value: 0,
          reserved: 0,
          setReservedAmountForSource: jest.fn(),
          getReservedAmountForSource: jest.fn().mockReturnValue(0),
          isAvailable: jest.fn().mockReturnValue(true),
        },
      },
      atmospheric: {},
    };
  });

  it('returns zero max buildable when sand is unavailable', () => {
    global.currentPlanetParameters = { specialAttributes: { hasSand: false } };

    const quarry = new SandQuarry(sandQuarryConfig, 'sandQuarry');

    expect(quarry.maxBuildable()).toBe(0);
  });

  it('allows building when sand is available', () => {
    global.currentPlanetParameters = { specialAttributes: { hasSand: true } };

    const quarry = new SandQuarry(sandQuarryConfig, 'sandQuarry');

    expect(quarry.maxBuildable()).toBe(2);
  });
});
