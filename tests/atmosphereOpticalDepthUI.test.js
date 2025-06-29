const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('atmosphere UI optical depth', () => {
  test('optical depth and wind multiplier positioned after table', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="summary-terraforming"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    const numbers = require('../src/js/numbers.js');
    ctx.formatNumber = numbers.formatNumber;
    ctx.toDisplayTemperature = numbers.toDisplayTemperature;
    ctx.getTemperatureUnit = numbers.getTemperatureUnit;

    ctx.resources = { atmospheric: { o2: { displayName: 'O2' } } };
    ctx.currentPlanetParameters = { resources: { atmospheric: { o2: { initialValue: 0 } } } };
    ctx.terraformingGasTargets = { o2: { min: 0, max: 100 } };
    ctx.projectManager = { isBooleanFlagSet: () => false };

    ctx.terraforming = {
      temperature: { name: 'Temp', value: 0, emissivity: 1, opticalDepth: 0.5, effectiveTempNoAtmosphere: 0,
        zones: { tropical: { value: 0, day: 0, night: 0 }, temperate: { value: 0, day: 0, night: 0 }, polar: { value: 0, day: 0, night: 0 } } },
      atmosphere: { name: 'Atm' },
      water: {}, luminosity: { name: 'Lum', albedo: 0, solarFlux: 0, modifiedSolarFlux: 0, calculateSolarPanelMultiplier: () => 1 },
      life: { name: 'Life' }, magnetosphere: { name: 'Mag' },
      celestialParameters: { albedo: 0, gravity: 1, radius: 1 },
      calculateSolarPanelMultiplier: () => 1,
      calculateWindTurbineMultiplier: () => 1,
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

    const box = dom.window.document.getElementById('atmosphere-box');
    const pEls = box.querySelectorAll('p');
    expect(pEls.length).toBe(3);
    expect(pEls[0].querySelector('#atmosphere-current')).not.toBeNull();
    expect(pEls[1].querySelector('#optical-depth')).not.toBeNull();
    expect(box.querySelector('#emissivity')).toBeNull();
    expect(pEls[2].querySelector('#wind-turbine-multiplier')).not.toBeNull();
    expect(pEls[1].classList.contains('no-margin')).toBe(true);
    expect(pEls[2].classList.contains('no-margin')).toBe(true);
  });
});
