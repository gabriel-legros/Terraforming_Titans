const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
global.Building = Building;
const { SolarPanel } = require('../src/js/buildings/solarPanel.js');

describe('Solar panel tooltip', () => {
  test('solar panel count includes build cap tooltip', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { runScripts: 'outside-only' });
    global.document = dom.window.document;
    const ctx = dom.getInternalVMContext();

    ctx.EffectableEntity = EffectableEntity;
    ctx.Building = Building;
    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => String(n);
    ctx.formatBuildingCount = n => String(n);
    ctx.formatResourceDetails = () => '';
    ctx.formatStorageDetails = () => '';
    ctx.multiplyByTen = n => n * 10;
    ctx.divideByTen = n => Math.max(1, Math.floor(n / 10));
    ctx.resources = { colony: { colonists: { value: 0 }, workers: { value: 0 } } };
    ctx.globalEffects = { isBooleanFlagSet: () => true };
    ctx.dayNightCycle = { isNight: () => false, isDay: () => true };
    ctx.toDisplayTemperature = () => 0;
    ctx.getTemperatureUnit = () => 'K';
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.updateColonyDetailsDisplay = () => {};
    ctx.updateEmptyBuildingMessages = () => {};
    ctx.updateBuildingDisplay = () => {};
    ctx.terraforming = { celestialParameters: {} };

    ctx.ghgFactorySettings = {
      autoDisableAboveTemp: false,
      disableTempThreshold: 283.15,
      reverseTempThreshold: 283.15,
    };
    ctx.oxygenFactorySettings = { autoDisableAbovePressure: false, disablePressureThreshold: 15 };
    ctx.enforceGhgFactoryTempGap = () => {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const config = {
      name: 'Solar Panel Array',
      category: 'energy',
      description: 'desc',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: true,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresDeposit: false,
      requiresWorker: 0,
      unlocked: true
    };

    const panel = new SolarPanel(config, 'solarPanel');

    const row = ctx.createStructureRow(panel, () => {}, () => {}, false);
    dom.window.document.body.appendChild(row);

    const tooltip = dom.window.document.querySelector('#solarPanel-count-active + .info-tooltip-icon, #solarPanel-count + .info-tooltip-icon');
    expect(tooltip).not.toBeNull();
    expect(tooltip.getAttribute('title')).toMatch(/10\s*×\s*the initial land/i);
  });

  test('solar panel tooltip persists after UI update', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="row"><span id="solarPanel-count">0</span></div>');
    global.document = dom.window.document;

    const config = {
      name: 'Solar Panel Array',
      category: 'energy',
      description: 'desc',
      cost: {},
      consumption: {},
      production: {},
      storage: {},
      dayNightActivity: true,
      canBeToggled: true,
      requiresMaintenance: false,
      requiresDeposit: false,
      requiresWorker: 0,
      unlocked: true
    };

    const panel = new SolarPanel(config, 'solarPanel');
    const cache = { row: dom.window.document.getElementById('row') };
    panel.initUI(null, cache);

    let tooltip = dom.window.document.querySelector('#solarPanel-count + .info-tooltip-icon');
    expect(tooltip).not.toBeNull();

    tooltip.remove();
    expect(dom.window.document.querySelector('#solarPanel-count + .info-tooltip-icon')).toBeNull();

    panel.updateUI(cache);

    tooltip = dom.window.document.querySelector('#solarPanel-count + .info-tooltip-icon');
    expect(tooltip).not.toBeNull();
    expect(tooltip.getAttribute('title')).toMatch(/10\s*×\s*the initial land/i);
  });
});
