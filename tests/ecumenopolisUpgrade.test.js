const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Ecumenopolis upgrade', () => {
  function setupContext(html = '<!DOCTYPE html><div id="colony-buildings-buttons"></div>') {
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.capitalizeFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.createColonyDetails = () => dom.window.document.createElement('div');
    ctx.globalEffects = { isBooleanFlagSet: () => false };
    ctx.ghgFactorySettings = {
      autoDisableAboveTemp: false,
      disableTempThreshold: 0,
      reverseTempThreshold: 0,
      restartCap: 1,
      restartTimer: 0,
    };
    ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
    ctx.enforceGhgFactoryTempGap = () => {};
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
        metal: { value: 0, displayName: 'Metal', decrease(v){ this.value -= v; } },
        glass: { value: 0, displayName: 'Glass', decrease(v){ this.value -= v; } },
        water: { value: 0, displayName: 'Water', decrease(v){ this.value -= v; } },
        superalloys: { value: 0, displayName: 'Superalloys', decrease(v){ this.value -= v; } },
        energy: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Energy' },
        food: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Food' },
        research: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Research' },
        electronics: { value: 0, displayName: 'Electronics' },
        androids: { value: 0, displayName: 'Androids', updateStorageCap: () => {} },
        colonists: { value: 0, cap: 0, displayName: 'Colonists', updateStorageCap: () => {} },
        workers: { value: 0, displayName: 'Workers' }
      },
      surface: { land: { value: 1000000, reserved: 1000000, reserve(v){ this.reserved += v; }, release(v){ this.reserved -= v; } } },
      underground: {}
    };
    ctx.buildings = {};
    ctx.maintenanceFraction = 0;

    const effectable = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    const building = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'building.js'), 'utf8');
    const colony = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony.js'), 'utf8');
    const structuresUI = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');

    vm.runInContext(effectable, ctx);
    vm.runInContext(building, ctx);
    vm.runInContext(colony, ctx);
    vm.runInContext(structuresUI, ctx);

    ctx.colonyParameters = {
      t6_colony: {
        name: 'Metropolis',
        category: 'Colony',
        cost: { colony: { metal: 5000000, water: 5000000, glass: 5000000 } },
        consumption: { colony: { energy: 2500000000, food: 100000, electronics: 1000, androids: 10 } },
        production: { colony: { research: 100000 } },
        storage: { colony: { colonists: 1000000 } },
        baseComfort: 1,
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        unlocked: false,
        requiresLand: 100000
      },
      t7_colony: {
        name: 'Ecumenopolis District',
        category: 'Colony',
        cost: { colony: { metal: 50000000, water: 50000000, glass: 50000000, superalloys: 1000000 } },
        consumption: { colony: { energy: 25000000000, food: 1000000, electronics: 10000, androids: 100 } },
        production: { colony: { research: 1000000 } },
        storage: { colony: { colonists: 10000000, androids: 100000000 } },
        baseComfort: 1,
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        unlocked: false,
        requiresLand: 100000
      }
    };

    ctx.colonies = ctx.initializeColonies(ctx.colonyParameters);
    return { dom, ctx };
  }

  test('Metropolis upgrades to Ecumenopolis with full superalloy cost', () => {
    const { dom, ctx } = setupContext();
    const t6 = ctx.colonies.t6_colony;
    const t7 = ctx.colonies.t7_colony;
    t6.unlocked = true;
    t7.unlocked = true;
    t6.count = t6.active = 10;

    ctx.resources.colony.metal.value = 25000000;
    ctx.resources.colony.glass.value = 25000000;
    ctx.resources.colony.superalloys.value = 1000000;

    ctx.createColonyButtons(ctx.colonies);
    ctx.updateStructureDisplay(ctx.colonies);

    const button = dom.window.document.getElementById('t6_colony-upgrade-button');
    expect(button.style.display).not.toBe('none');
    expect(button.disabled).toBe(false);

    const cost = t6.getUpgradeCost();
    expect(cost.colony.superalloys).toBe(1000000);

    button.click();

    expect(t6.count).toBe(0);
    expect(t7.count).toBe(1);
    expect(ctx.resources.colony.superalloys.value).toBe(0);
  });

  test('Metropolis upgrades multiple districts based on build count', () => {
    const { dom, ctx } = setupContext();
    const t6 = ctx.colonies.t6_colony;
    const t7 = ctx.colonies.t7_colony;
    t6.unlocked = true;
    t7.unlocked = true;
    t6.count = t6.active = 20;

    ctx.resources.colony.metal.value = 50000000;
    ctx.resources.colony.glass.value = 50000000;
    ctx.resources.colony.superalloys.value = 2000000;

    ctx.createColonyButtons(ctx.colonies);
    vm.runInContext("selectedBuildCounts['t6_colony'] = 20;", ctx);
    ctx.updateStructureDisplay(ctx.colonies);

    const button = dom.window.document.getElementById('t6_colony-upgrade-button');
    expect(button.disabled).toBe(false);

    const cost = t6.getUpgradeCost(2);
    expect(cost.colony.superalloys).toBe(2000000);

    button.click();

    expect(t6.count).toBe(0);
    expect(t7.count).toBe(2);
    expect(ctx.resources.colony.superalloys.value).toBe(0);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(ctx.resources.colony.glass.value).toBe(0);
  });
});

