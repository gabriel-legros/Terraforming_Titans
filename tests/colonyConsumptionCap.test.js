const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('colony consumption cap', () => {
  function setupContext() {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.createColonyDetails = () => dom.window.document.createElement('div');
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    const factorySettings = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'ghg-automation.js'), 'utf8');
    vm.runInContext(factorySettings, ctx);
    ctx.ghgFactorySettings.autoDisableAboveTemp = false;
    ctx.ghgFactorySettings.disableTempThreshold = 0;
    ctx.ghgFactorySettings.restartCap = 1;
    ctx.ghgFactorySettings.restartTimer = 0;
    ctx.dayNightCycle = { isNight: () => false };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.terraforming = null;
    ctx.milestonesManager = { getHappinessBonus: () => 0 };
    ctx.populationModule = {
      getWorkerAvailabilityRatio: () => 1,
      populationResource: { value: 0, cap: 0 },
      getCurrentGrowthPercent: () => 0,
      growthRate: 0,
      getEffectiveGrowthMultiplier: () => 1
    };
    ctx.gameSettings = { disableDayNightCycle: false, silenceUnlockAlert: true };
    ctx.registerBuildingUnlockAlert = () => {};

    ctx.resources = {
      colony: {
        energy: { value: 0, modifyRate: jest.fn(), consumptionRate: 0, productionRate: 0, displayName: 'Energy' },
        food: { value: 0, modifyRate: jest.fn(), consumptionRate: 0, productionRate: 0, displayName: 'Food' },
        colonists: { value: 0, cap: 0, displayName: 'Colonists', updateStorageCap: () => {} }
      },
      surface: { land: { value: 1000, reserved: 0, reserve(v){ this.reserved += v; }, release(v){ this.reserved -= v; } } },
      underground: {}
    };
    ctx.buildings = {};
    ctx.structures = {};
    ctx.maintenanceFraction = 0;

    const effectable = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const building = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
    const colony = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');

    vm.runInContext(effectable, ctx);
    vm.runInContext(building, ctx);
    vm.runInContext(colony, ctx);

    const colonyParameters = {
      t1_colony: {
        name: 'Research Outpost',
        category: 'Colony',
        displayName: 'Research Outpost',
        cost: { colony: { metal: 0, water: 0, glass: 0 } },
        consumption: { colony: { energy: 50000, food: 1 } },
        production: {},
        storage: { colony: { colonists: 10 } },
        baseComfort: 0,
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: false,
        maintenanceFactor: 0,
        unlocked: false,
        requiresLand: 0
      }
    };

    ctx.colonies = ctx.initializeColonies(colonyParameters);
    ctx.structures = ctx.colonies;
    return { ctx };
  }

  test('consumption is capped at active colonies', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    t1.unlocked = true;
    t1.count = 2;
    t1.active = 1;

    // Colonists exceed capacity to force ratio > 1
    ctx.resources.colony.colonists.value = 20;
    ctx.resources.colony.colonists.cap = 10;

    const accumulatedChanges = { colony: {} };
    t1.consume(accumulatedChanges, 1000);

    expect(accumulatedChanges.colony.energy).toBeCloseTo(-50000);
    expect(accumulatedChanges.colony.food).toBeCloseTo(-1);
    expect(ctx.resources.colony.energy.modifyRate).toHaveBeenCalledWith(-50000, t1.displayName, 'building');
    expect(ctx.resources.colony.food.modifyRate).toHaveBeenCalledWith(-1, t1.displayName, 'building');
  });
});
