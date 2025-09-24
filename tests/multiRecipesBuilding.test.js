const EffectableEntity = require('../src/js/effectable-entity.js');
const { Building } = require('../src/js/building.js');

global.EffectableEntity = EffectableEntity;
global.Building = Building;

global.maintenanceFraction = 0;
global.updateBuildingDisplay = () => {};

global.buildings = {};

global.resources = {
  colony: {
    metal: {
      value: 1_000,
      cap: 1_000,
      reserved: 0,
      updateStorageCap: () => {},
      maintenanceMultiplier: 1,
    },
    energy: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      maintenanceMultiplier: 1,
      productionRate: 0,
      consumptionRate: 0,
    },
    water: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      maintenanceMultiplier: 1,
      productionRate: 0,
      consumptionRate: 0,
    },
  },
  atmospheric: {
    carbonDioxide: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      productionRate: 0,
      consumptionRate: 0,
    },
    hydrogen: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      productionRate: 0,
      consumptionRate: 0,
    },
    oxygen: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      productionRate: 0,
      consumptionRate: 0,
    },
    methane: {
      value: 0,
      cap: 0,
      reserved: 0,
      updateStorageCap: () => {},
      productionRate: 0,
      consumptionRate: 0,
    },
  },
  surface: {
    land: {
      value: 0,
      reserved: 0,
      reserve: () => {},
      release: () => {},
    },
  },
  underground: {},
};

const { MultiRecipesBuilding } = require('../src/js/buildings/MultiRecipesBuilding.js');

describe('MultiRecipesBuilding', () => {
  const config = {
    name: 'Test Reactor',
    category: 'terraforming',
    description: '',
    cost: { colony: { metal: 1 } },
    consumption: { colony: { energy: 100_000 } },
    production: {},
    storage: {},
    dayNightActivity: false,
    canBeToggled: true,
    requiresMaintenance: true,
    requiresWorker: 0,
    maintenanceFactor: 1,
    unlocked: false,
    defaultRecipe: 'recipe1',
    recipes: {
      recipe1: {
        shortName: 'Bosch Reaction',
        consumption: {
          atmospheric: { carbonDioxide: 100, hydrogen: 9.09 },
        },
        production: { colony: { water: 81.82 } },
      },
      recipe2: {
        shortName: 'Water Synthesis',
        consumption: {
          atmospheric: { oxygen: 72.73, hydrogen: 9.09 },
        },
        production: { colony: { water: 81.82 } },
      },
      recipe3: {
        shortName: 'Methane Synthesis',
        consumption: {
          atmospheric: { carbonDioxide: 100, hydrogen: 18.18 },
        },
        production: {
          atmospheric: { methane: 36.36 },
          colony: { water: 81.82 },
        },
      },
    },
  };

  test('updates consumption and production when switching recipes', () => {
    const building = new MultiRecipesBuilding(config, 'chemicalReactor');

    expect(building.currentRecipeKey).toBe('recipe1');
    expect(building.consumption.atmospheric.carbonDioxide).toBeCloseTo(100);
    expect(building.production.colony.water).toBeCloseTo(81.82);

    building.setRecipe('recipe2');
    expect(building.currentRecipeKey).toBe('recipe2');
    expect(building.consumption.atmospheric.oxygen).toBeCloseTo(72.73, 2);
    expect(building.consumption.atmospheric.carbonDioxide).toBeUndefined();
    expect(building.production.colony.water).toBeCloseTo(81.82, 2);

    building.setRecipe('recipe3');
    expect(building.currentRecipeKey).toBe('recipe3');
    expect(building.consumption.atmospheric.hydrogen).toBeCloseTo(18.18, 2);
    expect(building.production.atmospheric.methane).toBeCloseTo(36.36, 2);
  });

  test('persists the selected recipe through save/load', () => {
    const building = new MultiRecipesBuilding(config, 'chemicalReactor');
    building.setRecipe('recipe3');
    const state = building.saveState();
    expect(state.currentRecipeKey).toBe('recipe3');

    const restored = new MultiRecipesBuilding(config, 'chemicalReactor');
    restored.loadState({ currentRecipeKey: 'recipe2' });
    expect(restored.currentRecipeKey).toBe('recipe2');
    expect(restored.consumption.atmospheric.oxygen).toBeCloseTo(72.73, 2);
    expect(restored.consumption.atmospheric.carbonDioxide).toBeUndefined();
  });
});
