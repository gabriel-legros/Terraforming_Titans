const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('surface albedo tooltip', () => {
  test('explains how water/ice and biomass percentages are determined', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateZonalSurfaceFractions = () => ({
      ocean: 0.2,
      ice: 0.1,
      hydrocarbon: 0,
      hydrocarbonIce: 0,
      co2_ice: 0,
      biomass: 0.05
    });
    ctx.ZONES = ['tropical'];
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    ctx.resources = {};
    ctx.terraforming = {
      luminosity: {
        name: 'Luminosity',
        groundAlbedo: 0.3,
        surfaceAlbedo: 0.3,
        actualAlbedo: 0.3,
        initialSurfaceAlbedo: 0.3,
        cloudHazePenalty: 0,
        solarFlux: 1000,
        modifiedSolarFlux: 1000
      },
      celestialParameters: { albedo: 0.25, surfaceArea: 100 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const tooltip = dom.window.document.getElementById('surface-albedo-tooltip').textContent;
    expect(tooltip).toContain('Biomass claims its share first');
    expect(tooltip).toContain('Ice and liquid water then split the remaining area');
  });
});
