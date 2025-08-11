const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('radiation display', () => {
  test('magnetosphere box shows orbital and surface radiation values', () => {
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
      temperature: { name: 'Temp', value: 0, emissivity: 1, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0 },
                temperate: { value: 0, day: 0, night: 0 },
                polar: { value: 0, day: 0, night: 0 } } },
      atmosphere: { name: 'Atm' },
      water: {},
      luminosity: { name: 'Lum', albedo: 0, solarFlux: 0, modifiedSolarFlux: 0 },
      life: { name: 'Life', target: 0.5 },
      magnetosphere: { name: 'Mag' },
      surfaceRadiation: 1.2345,
      orbitalRadiation: 2.3456,
      radiationPenalty: 0.1234,
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

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.createTerraformingSummaryUI();

    const orbitalEl = dom.window.document.getElementById('orbital-radiation');
    expect(orbitalEl).not.toBeNull();
    expect(orbitalEl.textContent).toBe(numbers.formatNumber(2.3456, false, 2));

    const radEl = dom.window.document.getElementById('surface-radiation');
    expect(radEl).not.toBeNull();
    expect(radEl.textContent).toBe(numbers.formatNumber(1.2345, false, 2));

    const penEl = dom.window.document.getElementById('surface-radiation-penalty');
    expect(penEl).not.toBeNull();
    expect(penEl.textContent).toBe(numbers.formatNumber(0.1234 * 100, false, 0));
  });

  test('radiation penalty hidden when below threshold', () => {
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
      temperature: { name: 'Temp', value: 0, emissivity: 1, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0 },
                temperate: { value: 0, day: 0, night: 0 },
                polar: { value: 0, day: 0, night: 0 } } },
      atmosphere: { name: 'Atm' },
      water: {},
      luminosity: { name: 'Lum', albedo: 0, solarFlux: 0, modifiedSolarFlux: 0 },
      life: { name: 'Life', target: 0.5 },
      magnetosphere: { name: 'Mag' },
      surfaceRadiation: 0.1,
      orbitalRadiation: 0.2,
      radiationPenalty: 0.00005,
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

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.createTerraformingSummaryUI();

    const penEl = dom.window.document.getElementById('surface-radiation-penalty');
    expect(penEl).not.toBeNull();
    expect(penEl.parentElement.style.display).toBe('none');
  });
});
