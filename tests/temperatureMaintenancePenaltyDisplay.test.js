const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('temperature maintenance penalty display', () => {
  test('shows only when penalty is greater than 1', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="summary-terraforming"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.getZonePercentage = require('../src/js/zones.js').getZonePercentage;
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    ctx.resources = { atmospheric: { o2: { displayName: 'O2', value: 0 } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: { o2: { initialValue: 0 } } } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 100 } };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    ctx.terraforming = {
      temperature: { name: 'Temp', value: 373.15, emissivity: 1, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0, initial: 0 },
                temperate: { value: 0, day: 0, night: 0, initial: 0 },
                polar: { value: 0, day: 0, night: 0, initial: 0 } } },
      atmosphere: { name: 'Atm' },
      water: {},
      luminosity: { name: 'Lum', albedo: 0, cloudHazePenalty: 0, solarFlux: 0, modifiedSolarFlux: 0 },
      life: { name: 'Life', target: 0.5 },
      magnetosphere: { name: 'Mag' },
      celestialParameters: { albedo: 0, gravity: 1, radius: 1, surfaceArea: 1 },
      calculateSolarPanelMultiplier: () => 1,
      calculateWindTurbineMultiplier: () => 1,
      getAtmosphereStatus: () => true,
      getLuminosityStatus: () => true,
      getMagnetosphereStatus: () => true,
      waterTarget: 0.2,
      totalEvaporationRate: 0,
      totalWaterSublimationRate: 0,
      totalRainfallRate: 0,
      totalSnowfallRate: 0,
      totalMeltRate: 0,
      totalFreezeRate: 0,
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: {}, temperate: {}, polar: {} }
    };
    ctx.terraforming.calculateColonyEnergyPenalty = () => 1;
    ctx.terraforming.calculateMaintenancePenalty = () => 1;
    ctx.terraforming.getTemperatureStatus = () => true;

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.createTerraformingSummaryUI();
    let el = dom.window.document.querySelector('#temperature-maintenance-penalty');
    expect(el.style.display).toBe('none');

    ctx.terraforming.calculateMaintenancePenalty = () => 2;
    ctx.updateTemperatureBox();
    el = dom.window.document.querySelector('#temperature-maintenance-penalty');
    expect(el.style.display).toBe('');
    expect(el.textContent).toContain('2.00');
  });
});
