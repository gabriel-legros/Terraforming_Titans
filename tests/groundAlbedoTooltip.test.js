const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('ground albedo tooltip', () => {
  test('includes black dust albedo value and coverage', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical','temperate','polar'];
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    ctx.resources = { special: { albedoUpgrades: { value: 30 } } };
    ctx.terraforming = {
      luminosity: { name: 'Luminosity', groundAlbedo: 0.3, surfaceAlbedo: 0.3, actualAlbedo: 0.3, albedo: 0.3, solarFlux: 1000, modifiedSolarFlux: 1000 },
      celestialParameters: { albedo: 0.25, surfaceArea: 100 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const tooltip = dom.window.document.getElementById('ground-albedo-tooltip').getAttribute('title');
    expect(tooltip).toContain('Black dust albedo: 0.05');
    expect(tooltip).toContain('Black dust coverage: 30.0%');
  });
});

