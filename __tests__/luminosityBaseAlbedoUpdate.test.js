const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('updateLuminosityBox', () => {
  test('updates base albedo from celestial parameters', () => {
    const dom = new JSDOM('<!DOCTYPE html><div class="row"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();

    ctx.terraforming = {
      luminosity: { name: 'Luminosity', albedo: 0, solarFlux: 0, modifiedSolarFlux: 0 },
      celestialParameters: { albedo: 0.25 },
      getLuminosityStatus: () => true,
      calculateSolarPanelMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'terraformingUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const row = dom.window.document.querySelector('.row');
    ctx.createLuminosityBox(row);

    ctx.terraforming.celestialParameters.albedo = 0.37;
    ctx.updateLuminosityBox();

    const text = dom.window.document.getElementById('base-albedo').textContent;
    expect(text).toBe('0.37');
  });
});
