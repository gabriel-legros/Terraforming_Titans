const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('luminosity flux tooltip', () => {
  test('shows average solar flux per zone', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.ZONES = ['tropical', 'temperate', 'polar'];
    ctx.calculateZonalSurfaceFractions = () => ({ ocean:0, ice:0, hydrocarbon:0, hydrocarbonIce:0, co2_ice:0, biomass:0 });
    ctx.projectManager = { isBooleanFlagSet: () => false };
    ctx.resources = { atmospheric: { o2: { displayName: 'O2', value: 0 } }, special: { albedoUpgrades: { value: 0 } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: { o2: { initialValue: 0 } } } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 100 } };
    ctx.terraforming = {
      temperature: { name: 'Temp', value: 0, emissivity: 1, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0, initial: 0 },
                temperate: { value: 0, day: 0, night: 0, initial: 0 },
                polar: { value: 0, day: 0, night: 0, initial: 0 } },
        calculateColonyEnergyPenalty: () => 1,
        getTemperatureStatus: () => true },
      atmosphere: { name: 'Atm' },
      water: {},
      luminosity: {
        name: 'Lum',
        groundAlbedo: 0,
        surfaceAlbedo: 0,
        actualAlbedo: 0,
        solarFlux: 1000,
        modifiedSolarFlux: 1000,
        zonalFluxes: { tropical: 1000, temperate: 800, polar: 400 }
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
      zonalSurface: { tropical: { biomass: 0 }, temperate: { biomass: 0 }, polar: { biomass: 0 } },
      zonalWater: { tropical: {}, temperate: {}, polar: {} }
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    const row = dom.window.document.getElementById('row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const tooltip = dom.window.document.getElementById('solar-flux-breakdown').title;
    expect(tooltip).toContain('Average Solar Flux');
    expect(tooltip).toContain('Tropical: 250.0');
    expect(tooltip).toContain('Temperate: 200.0');
    expect(tooltip).toContain('Polar: 100.0');
    expect(tooltip).toContain('day/night');
  });
});
