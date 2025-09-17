const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

function createResource() {
  return {
    value: 0,
    cap: 0,
    hasCap: true,
    maintenanceMultiplier: 1,
    modifyRate: () => {},
    updateStorageCap: () => {},
    productionRate: 0,
    consumptionRate: 0
  };
}

function createBaseContext() {
  const ctx = { console };
  vm.createContext(ctx);
  ctx.globalThis = ctx;
  ctx.EffectableEntity = EffectableEntity;
  ctx.maintenanceFraction = 0.1;
  ctx.globalGameIsLoadingFromSave = false;
  ctx.dayNightCycle = { isDay: () => true };
  ctx.populationModule = { getWorkerAvailabilityRatio: () => 1 };
  ctx.registerBuildingUnlockAlert = () => {};
  ctx.buildings = {};

  const colonyResources = {
    energy: { ...createResource() },
    metal: { ...createResource() },
    food: { ...createResource() },
    components: { ...createResource() },
    electronics: { ...createResource() },
    androids: { ...createResource() },
    colonists: { value: 100, cap: 100, modifyRate: () => {}, productionRate: 0, consumptionRate: 0 }
  };

  ctx.resources = {
    colony: colonyResources,
    surface: { land: { reserve: () => {}, release: () => {}, value: 0, reserved: 0 } },
    underground: {}
  };

  return ctx;
}

function loadBuildingInto(ctx) {
  const buildingPath = path.join(__dirname, '..', 'src/js', 'building.js');
  const code = fs.readFileSync(buildingPath, 'utf8');
  vm.runInContext(code + '; this.Building = Building;', ctx);
}

function loadColonyInto(ctx) {
  const colonyPath = path.join(__dirname, '..', 'src/js', 'colony.js');
  const code = fs.readFileSync(colonyPath, 'utf8');
  vm.runInContext(code + '; this.Colony = Colony;', ctx);
}

describe('Building save/load methods', () => {
  test('Building.saveState and loadState preserve dynamic fields', () => {
    const ctx = createBaseContext();
    loadBuildingInto(ctx);

    const config = {
      name: 'Factory',
      category: 'industry',
      description: '',
      cost: { colony: { energy: 1 } },
      consumption: { colony: { energy: 1 } },
      production: { colony: { metal: 1 } },
      storage: {},
      dayNightActivity: true,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: false,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
      temperatureMaintenanceImmune: false,
      powerPerBuilding: 0,
      recipes: {
        base: { production: { colony: { metal: 1 } } },
        alt: { production: { colony: { metal: 2 } }, displayName: 'Alt Factory' }
      },
      defaultRecipe: 'base'
    };

    const building = new ctx.Building(config, 'factory');
    building.unlocked = true;
    building.alertedWhenUnlocked = true;
    building.count = 5;
    building.active = 3;
    building.productivity = 0.75;
    building.isHidden = true;
    building.autoBuildEnabled = true;
    building.autoBuildPercent = 0.4;
    building.autoBuildPriority = true;
    building.autoBuildBasis = 'androids';
    building.workerPriority = 1;
    building.autoActiveEnabled = true;
    building.autoBuildPartial = true;
    building.reversalAvailable = true;
    building.reverseEnabled = true;
    building.autoReverse = true;
    building.currentRecipeKey = 'alt';
    building._applyRecipeMapping();
    building.booleanFlags.add('customFlag');

    const saved = building.saveState();
    expect(saved.count).toBe(5);
    expect(saved.booleanFlags).toBeUndefined();
    saved.booleanFlags = ['legacyFlag'];

    const restored = new ctx.Building(config, 'factory');
    expect(restored.currentRecipeKey).toBe('base');
    restored.loadState(saved);

    expect(restored.unlocked).toBe(true);
    expect(restored.count).toBe(5);
    expect(restored.active).toBe(3);
    expect(restored.productivity).toBe(0.75);
    expect(restored.isHidden).toBe(true);
    expect(restored.autoBuildEnabled).toBe(true);
    expect(restored.autoBuildPercent).toBe(0.4);
    expect(restored.autoBuildPriority).toBe(true);
    expect(restored.autoBuildBasis).toBe('androids');
    expect(restored.workerPriority).toBe(1);
    expect(restored.autoActiveEnabled).toBe(true);
    expect(restored.autoBuildPartial).toBe(true);
    expect(restored.reversalAvailable).toBe(true);
    expect(restored.reverseEnabled).toBe(true);
    expect(restored.autoReverse).toBe(true);
    expect(restored.currentRecipeKey).toBe('alt');
    expect(restored.displayName).toBe('Alt Factory');
    expect(restored.booleanFlags.size).toBe(0);
    expect(restored.cost.colony.energy).toBe(1);
    expect(restored.consumption.colony.energy).toBe(1);
    expect(restored.production.colony.metal).toBe(2);
  });

  test('Colony overrides save/load to include unique fields', () => {
    const ctx = createBaseContext();
    loadBuildingInto(ctx);
    loadColonyInto(ctx);

    const config = {
      name: 'Settlement',
      category: 'colony',
      description: '',
      cost: { colony: { energy: 1 } },
      consumption: { colony: { energy: 1, electronics: 1 } },
      production: { colony: {} },
      storage: {},
      dayNightActivity: true,
      canBeToggled: true,
      requiresMaintenance: true,
      maintenanceFactor: 1,
      requiresDeposit: null,
      requiresWorker: 0,
      unlocked: true,
      surfaceArea: 0,
      requiresProductivity: true,
      requiresLand: 0,
      temperatureMaintenanceImmune: false,
      powerPerBuilding: 0,
      baseComfort: 5
    };

    const colony = new ctx.Colony(config, 'settlement');
    colony.count = 4;
    colony.active = 2;
    colony.productivity = 0.6;
    colony.baseComfort = 12;
    colony.happiness = 0.8;
    colony.obsolete = true;
    colony.filledNeeds.energy = 0.5;
    colony.filledNeeds.electronics = 0.2;
    colony.luxuryResourcesEnabled.electronics = false;

    const saved = colony.saveState();
    const restored = new ctx.Colony(config, 'settlement');
    restored.loadState(saved);

    expect(restored.count).toBe(4);
    expect(restored.active).toBe(2);
    expect(restored.productivity).toBeCloseTo(0.6);
    expect(restored.baseComfort).toBe(12);
    expect(restored.happiness).toBeCloseTo(0.8);
    expect(restored.obsolete).toBe(true);
    expect(restored.filledNeeds.energy).toBeCloseTo(0.5);
    expect(restored.filledNeeds.electronics).toBeCloseTo(0.2);
    expect(restored.luxuryResourcesEnabled.electronics).toBe(false);
  });
});
