const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('ground albedo tooltip', () => {
  function setupDOM() {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical', 'temperate', 'polar'];
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;
    ctx.terraforming = {
      luminosity: { name: 'Luminosity', groundAlbedo: 0.3, surfaceAlbedo: 0.3, actualAlbedo: 0.3, albedo: 0.3, cloudHazePenalty: 0, solarFlux: 1000, modifiedSolarFlux: 1000 },
      celestialParameters: { albedo: 0.25, surfaceArea: 100 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { dom, ctx };
  }

  test('includes black and white dust albedo values and coverage', () => {
    const { dom, ctx } = setupDOM();
    ctx.resources = { special: { albedoUpgrades: { value: 30 }, whiteDust: { value: 20 } } };
    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();
    const tooltip = dom.window.document.getElementById('ground-albedo-tooltip').textContent;
    expect(tooltip).toContain('Black dust albedo: 0.050');
    expect(tooltip).toContain('Black dust coverage: 30.0%');
    expect(tooltip).toContain('White dust albedo: 0.800');
    expect(tooltip).toContain('White dust coverage: 20.0%');
  });

  test('omits white dust coverage when zero', () => {
    const { dom, ctx } = setupDOM();
    ctx.resources = { special: { albedoUpgrades: { value: 30 }, whiteDust: { value: 0 } } };
    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();
    const tooltip = dom.window.document.getElementById('ground-albedo-tooltip').textContent;
    expect(tooltip).toContain('Black dust coverage: 30.0%');
    expect(tooltip).not.toContain('White dust coverage');
  });

  test('omits black dust coverage when zero', () => {
    const { dom, ctx } = setupDOM();
    ctx.resources = { special: { albedoUpgrades: { value: 0 }, whiteDust: { value: 20 } } };
    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();
    const tooltip = dom.window.document.getElementById('ground-albedo-tooltip').textContent;
    expect(tooltip).toContain('White dust coverage: 20.0%');
    expect(tooltip).not.toContain('Black dust coverage');
  });
});
