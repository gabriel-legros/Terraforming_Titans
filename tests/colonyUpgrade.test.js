const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('colony upgrade', () => {
  function setupContext(html = '<!DOCTYPE html><div id="root"></div>') {
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
    ctx.ghgFactorySettings = { autoDisableAboveTemp: false, disableTempThreshold: 0, restartCap: 1, restartTimer: 0 };
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
        energy: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Energy' },
        food: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Food' },
        research: { value: 0, consumptionRate: 0, productionRate: 0, displayName: 'Research' },
        colonists: { value: 0, cap: 0, displayName: 'Colonists', updateStorageCap: () => {} },
        workers: { value: 0, displayName: 'Workers' }
      },
      surface: { land: { value: 1000, reserved: 0, reserve(v){ this.reserved += v; }, release(v){ this.reserved -= v; } } },
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
      t1_colony: {
        name: 'Research Outpost',
        category: 'Colony',
        displayName: 'Research Outpost',
        cost: { colony: { metal: 50, water: 50, glass: 100 } },
        consumption: { colony: { energy: 50000, food: 1 } },
        production: { colony: { research: 1 } },
        storage: { colony: { colonists: 10 } },
        baseComfort: 0,
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        unlocked: false,
        requiresLand: 1
      },
      t2_colony: {
        name: 'Permanent Outpost',
        category: 'Colony',
        displayName: 'Permanent Outpost',
        cost: { colony: { metal: 250, water: 500, glass: 250 } },
        consumption: { colony: { energy: 250000, food: 10 } },
        production: { colony: { research: 10 } },
        storage: { colony: { colonists: 100 } },
        baseComfort: 0.2,
        dayNightActivity: false,
        canBeToggled: true,
        requiresMaintenance: true,
        maintenanceFactor: 1,
        unlocked: false,
        requiresLand: 10
      }
    };

    ctx.colonies = ctx.initializeColonies(ctx.colonyParameters);
    return { dom, ctx };
  }

  test('upgrade converts ten buildings and spends resources', () => {
    const { dom, ctx } = setupContext('<!DOCTYPE html><div id="colony-buildings-buttons"></div>');
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = t1.active = 10;
    ctx.resources.colony.metal.value = 125;
    ctx.resources.colony.glass.value = 125;
    ctx.resources.colony.water.value = 0;

    ctx.createColonyButtons(ctx.colonies);
    ctx.updateStructureDisplay(ctx.colonies);

    const button = dom.window.document.getElementById('t1_colony-upgrade-button');
    expect(button.disabled).toBe(false);
    button.click();

    expect(t1.count).toBe(0);
    expect(t2.count).toBe(1);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(ctx.resources.colony.glass.value).toBe(0);
    expect(ctx.resources.colony.water.value).toBe(0);
    expect(ctx.resources.surface.land.reserved).toBe(0);
  });

  test('upgrade scales cost when fewer than ten buildings', () => {
    const { dom, ctx } = setupContext('<!DOCTYPE html><div id="colony-buildings-buttons"></div>');
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = t1.active = 8;
    ctx.resources.colony.metal.value = 150;
    ctx.resources.colony.glass.value = 150;
    ctx.resources.colony.water.value = 100;

    ctx.createColonyButtons(ctx.colonies);
    ctx.updateStructureDisplay(ctx.colonies);

    const button = dom.window.document.getElementById('t1_colony-upgrade-button');
    expect(button.disabled).toBe(false);
    button.click();

    expect(t1.count).toBe(0);
    expect(t2.count).toBe(1);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(ctx.resources.colony.glass.value).toBe(0);
    expect(ctx.resources.colony.water.value).toBe(0);
    expect(ctx.resources.surface.land.reserved).toBe(2);
  });

  test('upgrade cost scales with available lower tier buildings', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;

    t1.count = t1.active = 5;
    let cost = t1.getUpgradeCost(1);
    expect(cost.colony.metal).toBeCloseTo(187.5);
    expect(cost.colony.glass).toBeCloseTo(187.5);
    expect(cost.colony.water).toBeCloseTo(250);
    expect(cost.surface.land).toBeCloseTo(5);

    t1.count = t1.active = 1;
    cost = t1.getUpgradeCost(1);
    expect(cost.colony.metal).toBeCloseTo(237.5);
    expect(cost.colony.glass).toBeCloseTo(237.5);
    expect(cost.colony.water).toBeCloseTo(450);
    expect(cost.surface.land).toBeCloseTo(9);
  });

  test('upgrade button colors unaffordable cost parts red', () => {
    const { dom, ctx } = setupContext('<!DOCTYPE html><div id="colony-buildings-buttons"></div>');
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = t1.active = 10;
    ctx.resources.colony.metal.value = 100; // insufficient
    ctx.resources.colony.glass.value = 125; // enough

    ctx.createColonyButtons(ctx.colonies);
    ctx.updateStructureDisplay(ctx.colonies);

    const button = dom.window.document.getElementById('t1_colony-upgrade-button');
    const spans = Array.from(button._spans.values());
    const metalSpan = spans.find(s => s.textContent.startsWith('Metal'));
    const glassSpan = spans.find(s => s.textContent.startsWith('Glass'));
    expect(metalSpan.style.color).toBe('red');
    expect(glassSpan.style.color).toBe('');
    expect(button.style.color).toBe('');
  });

  test('upgrade button hidden when next tier locked', () => {
    const { dom, ctx } = setupContext('<!DOCTYPE html><div id="colony-buildings-buttons"></div>');
    const t1 = ctx.colonies.t1_colony;
    t1.unlocked = true;
    ctx.colonies.t2_colony.unlocked = false;
    ctx.createColonyButtons(ctx.colonies);
    ctx.updateStructureDisplay(ctx.colonies);
    const button = dom.window.document.getElementById('t1_colony-upgrade-button');
    expect(button.style.display).toBe('none');
  });

  test('upgrade consumes active colonies before inactive ones', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = 15; // 10 inactive, 5 active
    t1.active = 5;

    ctx.resources.colony.metal.value = 125;
    ctx.resources.colony.glass.value = 125;

    const upgraded = t1.upgrade(1);
    expect(upgraded).toBe(true);
    expect(t1.count).toBe(5);
    expect(t1.active).toBe(0); // active colonies consumed first
    expect(t2.count).toBe(1);
    expect(ctx.resources.colony.metal.value).toBe(0);
    expect(ctx.resources.colony.glass.value).toBe(0);
  });

  test('upgrade does not drop active count below zero', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = 6; // 2 inactive, 4 active
    t1.active = 4;

    ctx.resources.colony.metal.value = 200;
    ctx.resources.colony.glass.value = 200;
    ctx.resources.colony.water.value = 200;
    ctx.resources.surface.land.value = 10;

    const upgraded = t1.upgrade(1);
    expect(upgraded).toBe(true);
    expect(t1.count).toBe(0);
    expect(t1.active).toBe(0); // should not go negative
    expect(t2.count).toBe(1);
    expect(ctx.resources.surface.land.reserved).toBe(6);
  });

  test('upgrade requires land for inactive colonies even with active land available', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = 10; // 5 active, 5 inactive
    t1.active = 5;

    ctx.resources.colony.metal.value = 125;
    ctx.resources.colony.glass.value = 125;
    ctx.resources.surface.land.value = 7; // less than required 10

    expect(t1.canAffordUpgrade(1)).toBe(false);
    expect(t1.upgrade(1)).toBe(false);
  });

  test('upgrade fails when insufficient land even with inactive colonies', () => {
    const { ctx } = setupContext();
    const t1 = ctx.colonies.t1_colony;
    const t2 = ctx.colonies.t2_colony;
    t1.unlocked = true;
    t2.unlocked = true;
    t1.count = 6; // all inactive
    t1.active = 0;

    ctx.resources.colony.metal.value = 200;
    ctx.resources.colony.glass.value = 200;
    ctx.resources.colony.water.value = 200;
    ctx.resources.surface.land.value = 3; // less than required 4

    expect(t1.canAffordUpgrade(1)).toBe(false);
    expect(t1.upgrade(1)).toBe(false);
    expect(t1.count).toBe(6);
    expect(t2.count).toBe(0);
  });
});
