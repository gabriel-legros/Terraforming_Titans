const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Hyperion Lantern UI display', () => {
  test('shows solar flux scaled with productivity', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="details"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.terraforming = { celestialParameters: { crossSectionArea: 100 } };

    const structure = {
      name: 'hyperionLantern',
      displayName: 'Hyperion Lantern',
      powerPerBuilding: 100,
      active: 2,
      productivity: 0.5,
      getModifiedStorage: () => ({}),
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({}),
      requiresMaintenance: false,
      maintenanceCost: {},
      getEffectiveProductionMultiplier: () => 1
    };

    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
    vm.runInContext(code, ctx);

    const detailsElement = dom.window.document.getElementById('details');
    ctx.updateProductionConsumptionDetails(structure, detailsElement);

    expect(detailsElement.innerHTML).toContain('Provides');
    expect(detailsElement.innerHTML).toContain('1 W/m² solar flux');
  });
});
