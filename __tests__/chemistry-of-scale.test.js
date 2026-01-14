const EffectableEntity = require('../src/js/effectable-entity.js');
const { Building } = require('../src/js/building.js');

// Set up global Building for MultiRecipesBuilding
global.Building = Building;

const { MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding.js');

// Set up global MultiRecipesBuilding for ChemicalReactor
global.MultiRecipesBuilding = MultiRecipesBuilding;

const { ChemicalReactor } = require('../src/js/buildings/ChemicalReactor.js');

describe('Chemistry of Scale', () => {
  let reactor;

  beforeEach(() => {
    // Mock global resources object
    global.resources = {
      colony: {
        metal: { maintenanceMultiplier: 1 },
        water: { maintenanceMultiplier: 1 }
      }
    };
    
    // Mock maintenanceFraction
    global.maintenanceFraction = 0.01;
    
    // Mock spaceManager
    global.spaceManager = {
      isArtificialWorld: () => false
    };
    
    // Mock researchManager
    global.researchManager = {
      isBooleanFlagSet: () => false
    };
    // Create a minimal chemical reactor configuration
    const config = {
      name: 'Test Reactor',
      category: 'test',
      description: 'Test reactor',
      cost: { colony: { metal: 100 } },
      consumption: { colony: { water: 1 } },
      production: { atmospheric: { oxygen: 1 } },
      requiresWorker: 0,
      unlocked: true,
      recipes: {
        bosch: {
          displayName: 'Bosch Reactor',
          production: { colony: { water: 1 } }
        }
      },
      defaultRecipe: 'bosch'
    };

    reactor = new ChemicalReactor(config, 'testReactor');
  });

  test('should not apply effect when flag is not set', () => {
    reactor.active = 10;
    reactor._applyChemistryOfScaleEffect();

    const prodMultiplier = reactor.getEffectiveProductionMultiplier();
    const consMultiplier = reactor.getEffectiveConsumptionMultiplier();

    expect(prodMultiplier).toBe(1);
    expect(consMultiplier).toBe(1);
  });

  test('should apply effect when flag is set', () => {
    // Set the boolean flag
    reactor.applyBooleanFlag({
      flagId: 'chemistryOfScale',
      value: true
    });

    reactor.active = 10;
    reactor._applyChemistryOfScaleEffect();

    const prodMultiplier = reactor.getEffectiveProductionMultiplier();
    const consMultiplier = reactor.getEffectiveConsumptionMultiplier();

    // Expected: 1 + log10(10) / 5 = 1 + 1/5 = 1.2
    expect(prodMultiplier).toBeCloseTo(1.2, 5);
    expect(consMultiplier).toBeCloseTo(1.2, 5);
  });

  test('should calculate correct multiplier for different active counts', () => {
    reactor.applyBooleanFlag({
      flagId: 'chemistryOfScale',
      value: true
    });

    // Test with 1 active reactor
    reactor.active = 1;
    reactor._applyChemistryOfScaleEffect();
    let multiplier = reactor.getEffectiveProductionMultiplier();
    // 1 + log10(1) / 5 = 1 + 0/5 = 1
    expect(multiplier).toBeCloseTo(1, 5);

    // Test with 100 active reactors
    reactor.active = 100;
    reactor._applyChemistryOfScaleEffect();
    multiplier = reactor.getEffectiveProductionMultiplier();
    // 1 + log10(100) / 5 = 1 + 2/5 = 1.4
    expect(multiplier).toBeCloseTo(1.4, 5);

    // Test with 1000 active reactors
    reactor.active = 1000;
    reactor._applyChemistryOfScaleEffect();
    multiplier = reactor.getEffectiveProductionMultiplier();
    // 1 + log10(1000) / 5 = 1 + 3/5 = 1.6
    expect(multiplier).toBeCloseTo(1.6, 5);
  });

  test('should not apply effect when active count is 0', () => {
    reactor.applyBooleanFlag({
      flagId: 'chemistryOfScale',
      value: true
    });

    reactor.active = 0;
    reactor._applyChemistryOfScaleEffect();

    const prodMultiplier = reactor.getEffectiveProductionMultiplier();
    const consMultiplier = reactor.getEffectiveConsumptionMultiplier();

    expect(prodMultiplier).toBe(1);
    expect(consMultiplier).toBe(1);
  });

  test('should use isBooleanFlagSet correctly', () => {
    expect(reactor.isBooleanFlagSet('chemistryOfScale')).toBe(false);

    reactor.applyBooleanFlag({
      flagId: 'chemistryOfScale',
      value: true
    });

    expect(reactor.isBooleanFlagSet('chemistryOfScale')).toBe(true);
  });

  test('should update effect when active count changes', () => {
    reactor.applyBooleanFlag({
      flagId: 'chemistryOfScale',
      value: true
    });

    // Start with 10 active
    reactor.active = 10;
    reactor._applyChemistryOfScaleEffect();
    let multiplier = reactor.getEffectiveProductionMultiplier();
    expect(multiplier).toBeCloseTo(1.2, 5);

    // Change to 100 active
    reactor.active = 100;
    reactor._applyChemistryOfScaleEffect();
    multiplier = reactor.getEffectiveProductionMultiplier();
    expect(multiplier).toBeCloseTo(1.4, 5);
  });
});
