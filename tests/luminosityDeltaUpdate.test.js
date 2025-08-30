const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const numbers = require('../src/js/numbers.js');

describe('updateLuminosityBox', () => {
  test('updates albedo and solar flux deltas', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical','temperate','polar'];
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical','temperate','polar'];
    ctx.DEFAULT_SURFACE_ALBEDO = require('../src/js/physics.js').DEFAULT_SURFACE_ALBEDO;

    ctx.terraforming = {
      luminosity: { name: 'Luminosity', groundAlbedo: 0.3, surfaceAlbedo: 0.3, actualAlbedo: 0.3, albedo: 0.3, solarFlux: 1000, modifiedSolarFlux: 1000, initialSurfaceAlbedo: 0.3, initialActualAlbedo: 0.3 },
      celestialParameters: { albedo: 0.3 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);

    ctx.terraforming.luminosity.surfaceAlbedo = 0.35;
    ctx.terraforming.luminosity.actualAlbedo = 0.32;
    ctx.terraforming.luminosity.albedo = 0.35;
    ctx.terraforming.luminosity.modifiedSolarFlux = 1100;
    ctx.updateLuminosityBox();

    const albedoDelta = dom.window.document.getElementById('surface-albedo-delta').textContent;
    expect(albedoDelta).toBe('+0.050');

    const fluxDelta = dom.window.document.getElementById('solar-flux-delta').textContent;
    expect(fluxDelta).toBe('+100.00');

    const actualDelta = dom.window.document.getElementById('actual-albedo-delta').textContent;
    expect(actualDelta).toBe('+0.020');
  });

  test('uses ground albedo when initial value missing', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;

    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical','temperate','polar'];

    ctx.terraforming = {
      luminosity: { name: 'Luminosity', groundAlbedo: 0.25, surfaceAlbedo: 0.25, actualAlbedo: 0.25, albedo: 0.25, solarFlux: 1000, modifiedSolarFlux: 1000 },
      celestialParameters: { albedo: 0.3 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);

    ctx.terraforming.luminosity.surfaceAlbedo = 0.28;
    ctx.terraforming.luminosity.actualAlbedo = 0.26;
    ctx.updateLuminosityBox();

    const delta = dom.window.document.getElementById('surface-albedo-delta').textContent;
    expect(delta).toBe('+0.030');

    const adelta = dom.window.document.getElementById('actual-albedo-delta').textContent;
    expect(adelta).toBe('+0');
  });

  test('solar flux delta uses initialSolarFlux when provided', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;
    ctx.calculateAverageCoverage = () => 0;
    ctx.calculateSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.calculateZonalSurfaceFractions = () => ({ ocean: 0, ice: 0, biomass: 0 });
    ctx.ZONES = ['tropical','temperate','polar'];

    ctx.terraforming = {
      luminosity: { name: 'Luminosity', groundAlbedo: 0.3, surfaceAlbedo: 0.3, actualAlbedo: 0.3, albedo: 0.3, solarFlux: 900, modifiedSolarFlux: 1100, initialSolarFlux: 1000, initialSurfaceAlbedo: 0.3, initialActualAlbedo: 0.3 },
      celestialParameters: { albedo: 0.3 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'terraforming', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);
    ctx.updateLuminosityBox();

    const fluxDelta = dom.window.document.getElementById('solar-flux-delta').textContent;
    expect(fluxDelta).toBe('+100.00');
  });
});
