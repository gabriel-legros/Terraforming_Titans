const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('actual albedo tooltip', () => {
  test('breaks down albedo components', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.ZONES = ['tropical'];
    ctx.calculateZonalSurfaceFractions = () => ({ ocean:0, ice:0, hydrocarbon:0, hydrocarbonIce:0, co2_ice:0, biomass:0 });
    ctx.projectManager = { isBooleanFlagSet: () => false };
    ctx.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: {} } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 100 } };
    ctx.calculateActualAlbedoPhysics = () => ({
      components: { A_surf: 0.3, dA_ch4: 0.01, dA_calcite: 0.02, dA_cloud: 0.03 },
      diagnostics: { tau_ch4_sw: 0.1, tau_calcite_sw: 0.2 }
    });
    ctx.terraforming = {
      temperature: { name: 'Temp', value: 0, emissivity: 1, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0, initial: 0 } },
        calculateColonyEnergyPenalty: () => 1,
        getTemperatureStatus: () => true },
      atmosphere: { name: 'Atm' },
      water: {},
      luminosity: {
        name: 'Lum',
        groundAlbedo: 0.3,
        surfaceAlbedo: 0.3,
        actualAlbedo: 0.36,
        solarFlux: 1000,
        modifiedSolarFlux: 1000
      },
      life: { name: 'Life', target: 0 },
      magnetosphere: { name: 'Mag' },
      celestialParameters: { albedo: 0, gravity: 1, radius: 1, surfaceArea: 1 },
      calculateSolarPanelMultiplier: () => 1,
      calculateWindTurbineMultiplier: () => 1,
      getAtmosphereStatus: () => true,
      getLuminosityStatus: () => true,
      getMagnetosphereStatus: () => true,
      waterTarget: 0,
      totalEvaporationRate: 0,
      totalWaterSublimationRate: 0,
      totalRainfallRate: 0,
      totalSnowfallRate: 0,
      totalMeltRate: 0,
      totalFreezeRate: 0,
      zonalSurface: { tropical: { biomass: 0 } },
      zonalWater: { tropical: {} },
      calculateTotalPressure: () => 100,
      calculateAtmosphericComposition: () => ({ composition: {} }),
      resources: { atmospheric: { calciteAerosol: { value: 0 } } }
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    const row = dom.window.document.getElementById('row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const tooltip = dom.window.document.getElementById('actual-albedo-tooltip').textContent;
    expect(tooltip).toContain('Actual albedo = Surface + Haze + Calcite + Clouds');
    expect(tooltip).toContain('Surface (base): 0.300');
    expect(tooltip).toContain('Haze (CH4): +0.010');
    expect(tooltip).toContain('Calcite aerosol: +0.020');
    expect(tooltip).toContain('Total: 0.360');
  });
});
