const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

const numbers = require('../numbers.js');

describe('updateLuminosityBox', () => {
  test('updates albedo and solar flux deltas', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.formatNumber = numbers.formatNumber;

    ctx.terraforming = {
      luminosity: { name: 'Luminosity', albedo: 0.3, solarFlux: 1000, modifiedSolarFlux: 1000 },
      celestialParameters: { albedo: 0.3 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);

    ctx.terraforming.luminosity.albedo = 0.35;
    ctx.terraforming.luminosity.modifiedSolarFlux = 1100;
    ctx.updateLuminosityBox();

    const albedoDelta = dom.window.document.getElementById('albedo-delta').textContent;
    expect(albedoDelta).toBe('+0.05');

    const fluxDelta = dom.window.document.getElementById('solar-flux-delta').textContent;
    expect(fluxDelta).toBe('+100.00');
  });
});
