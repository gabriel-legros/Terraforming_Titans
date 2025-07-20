const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('atmosphere gas status icons', () => {
  test('status reflects gas targets', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="summary-terraforming"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    const physics = require('../src/js/physics.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;
    ctx.getZonePercentage = require('../src/js/zones.js').getZonePercentage;
    ctx.DEFAULT_SURFACE_ALBEDO = physics.DEFAULT_SURFACE_ALBEDO;
    ctx.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;

    ctx.resources = { atmospheric: { o2: { displayName: 'O2', value: 0 } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: { o2: { initialValue: 0 } } } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 0 } };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    ctx.terraforming = {
      temperature: { name: 'Temp', value: 0, emissivity: 1, opticalDepth: 0,
        effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0 }, temperate: { value: 0, day: 0, night: 0 }, polar: { value: 0, day: 0, night: 0 } } },
      atmosphere: { name: 'Atm' },
      water: {}, luminosity: { name: 'Lum', albedo: 0, solarFlux: 0, modifiedSolarFlux: 0, calculateSolarPanelMultiplier: () => 1 },
      life: { name: 'Life' }, magnetosphere: { name: 'Mag' },
      celestialParameters: { albedo: 0, gravity: 1, radius: 1 },
      calculateSolarPanelMultiplier: () => 1,
      calculateWindTurbineMultiplier: () => 1,
      calculateTotalPressure: () => 0,
      getAtmosphereStatus: () => true,
      getLuminosityStatus: () => true,
      getMagnetosphereStatus: () => true,
      getWaterStatus: () => true,
      getLifeStatus: () => true,
      isBooleanFlagSet: () => false
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    ctx.createTerraformingSummaryUI();
    ctx.updateAtmosphereBox();

    const statusEl = dom.window.document.getElementById('o2-status');
    expect(statusEl.textContent).toBe('✓');
    expect(statusEl.classList.contains('status-check')).toBe(true);

    ctx.resources.atmospheric.o2.value = 1;
    ctx.updateAtmosphereBox();
    expect(statusEl.textContent).toBe('✗');
    expect(statusEl.classList.contains('status-cross')).toBe(true);
  });
});
