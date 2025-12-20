const { terraformingRequirements } = require('../src/js/terraforming/terraforming-requirements.js');

const biodomeConfig = {
  name: 'Biodome',
  category: 'terraforming',
  description: 'Produces life using the active life metabolism inputs and artificial light.',
  cost: { colony: { metal: 50, glass: 500, components: 10, electronics: 10 } },
  consumption: {
    colony: { energy: { amount: 10000000, ignoreProductivity: true }, water: 0.1 },
    atmospheric: { carbonDioxide: 0.244 },
  },
  production: { atmospheric: { oxygen: 0.177388 }, surface: { biomass: 0.166612 } },
  storage: {},
  dayNightActivity: false,
  canBeToggled: true,
  requiresMaintenance: true,
  requiresWorker: 100,
  maintenanceFactor: 1,
  unlocked: false,
  requiresLand: 100,
};

describe('Biodome metabolism alignment', () => {
  let Biodome;

  const createResource = () => ({
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
      getEffectiveResourceProductionMultiplier() { return 1; }
      hasBooleanFlag() { return false; }
    };

    global.dayNightCycle = { isDay: () => true };
    global.maintenanceFraction = 0.001;
    global.getActiveLifeMetabolismProcess =
      require('../src/js/life.js').getActiveLifeMetabolismProcess;

    const { Building } = require('../src/js/building.js');
    global.Building = Building;

    Biodome = require('../src/js/buildings/Biodome.js').Biodome;
  });

  beforeEach(() => {
    global.resources = {
      colony: {
        metal: createResource(),
        glass: createResource(),
        components: createResource(),
        electronics: createResource(),
        energy: createResource(),
        water: createResource(),
      },
      surface: {
        biomass: createResource(),
      },
      atmospheric: {
        carbonDioxide: createResource(),
        oxygen: createResource(),
        hydrogen: createResource(),
        atmosphericMethane: createResource(),
        atmosphericWater: createResource(),
      },
      underground: {},
    };

    global.terraforming = {
      requirements: {
        lifeDesign: terraformingRequirements.human.lifeDesign,
      },
    };
  });

  afterEach(() => {
    delete global.resources;
    delete global.terraforming;
  });

  it('updates consumption and production to match the active metabolism', () => {
    const biodome = new Biodome(biodomeConfig, 'biodome');
    const baseBiomass = biodome.baseBiomassRate;

    biodome.refreshMetabolismRates();

    expect(biodome.consumption.colony.energy).toMatchObject({
      amount: 10000000,
      ignoreProductivity: true,
    });
    expect(biodome.consumption.colony.water).toBeCloseTo(baseBiomass * 0.6, 6);
    expect(biodome.consumption.atmospheric.carbonDioxide).toBeCloseTo(
      baseBiomass * 1.4666666666666666,
      6
    );
    expect(biodome.production.atmospheric.oxygen).toBeCloseTo(
      baseBiomass * 1.0666666666666667,
      6
    );

    global.terraforming.requirements.lifeDesign = terraformingRequirements.gabbagian.lifeDesign;
    biodome.refreshMetabolismRates();

    expect(biodome.consumption.colony.water).toBeCloseTo(baseBiomass * 0.2, 6);
    expect(biodome.consumption.atmospheric.carbonDioxide).toBeCloseTo(
      baseBiomass * 2.641666666666667,
      6
    );
    expect(biodome.consumption.atmospheric.hydrogen).toBeCloseTo(
      baseBiomass * 0.38333333333333336,
      6
    );
    expect(biodome.production.atmospheric.atmosphericMethane).toBeCloseTo(
      baseBiomass * 0.5,
      6
    );
    expect(biodome.production.atmospheric.atmosphericWater).toBeCloseTo(
      baseBiomass * 1.725,
      6
    );
    expect(biodome.production.atmospheric.oxygen).toBeUndefined();
  });
});
