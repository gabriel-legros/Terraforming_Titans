const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('actual albedo tooltip', () => {
  test('lists component contributions before zonal breakdown', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.ZONES = ['tropical', 'temperate'];
    ctx.calculateZonalSurfaceFractions = () => ({ ocean:0, ice:0, hydrocarbon:0, hydrocarbonIce:0, co2_ice:0, biomass:0 });
    ctx.projectManager = { isBooleanFlagSet: () => false };
    ctx.resources = { atmospheric: {}, special: { albedoUpgrades: { value: 0 } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: {} } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 100 } };
    ctx.calculateActualAlbedoPhysics = surfAlb => ({
      albedo: surfAlb + 0.06,
      components: { A_surf: surfAlb, dA_ch4: 0.01, dA_calcite: 0.02, dA_cloud: 0.03 },
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
        cloudHazePenalty: 0,
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
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 } },
      zonalWater: { tropical: {}, temperate: {} },
      calculateZonalSurfaceAlbedo: z => (z === 'temperate' ? 0.35 : 0.3),
      calculateTotalPressure: () => 100,
      calculateAtmosphericComposition: () => ({ composition: {} }),
      resources: { atmospheric: { calciteAerosol: { value: 0 } } }
    };
    ctx.terraforming.calculateMaintenancePenalty = () => 1;
    ctx.terraforming.calculateColonyEnergyPenalty = () => 1;

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    const row = dom.window.document.getElementById('row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const tooltip = dom.window.document.getElementById('actual-albedo-tooltip').textContent;
    expect(tooltip).toContain('Actual albedo = Surface + Haze + Calcite + Clouds');
    expect(tooltip).not.toContain('Total:');

    const surfaceIdx = tooltip.indexOf('Surface (base): 0.300');
    const hazeIdx = tooltip.indexOf('Haze (CH4): +0.010');
    const calciteIdx = tooltip.indexOf('Calcite aerosol: +0.020');
    const cloudsIdx = tooltip.indexOf('Clouds: +0.030');
    const byZoneIdx = tooltip.indexOf('By zone:');
    const tropicalIdx = tooltip.indexOf('Tropical: 0.360');
    const temperateIdx = tooltip.indexOf('Temperate: 0.410');

    expect(surfaceIdx).toBeGreaterThan(-1);
    expect(hazeIdx).toBeGreaterThan(surfaceIdx);
    expect(calciteIdx).toBeGreaterThan(hazeIdx);
    expect(cloudsIdx).toBeGreaterThan(calciteIdx);
    expect(byZoneIdx).toBeGreaterThan(cloudsIdx);
    expect(tropicalIdx).toBeGreaterThan(byZoneIdx);
    expect(temperateIdx).toBeGreaterThan(tropicalIdx);
  });
});
