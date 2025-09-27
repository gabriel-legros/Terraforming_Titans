const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('Space Mirror UI display', () => {
  test('shows solar flux from active mirrors', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="details"></div>', { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.formatNumber = numbers.formatNumber;
    ctx.terraforming = {
      calculateMirrorEffect: () => ({ powerPerUnitArea: 2 })
    };

    const structure = {
      name: 'spaceMirror',
      displayName: 'Space Mirror',
      active: 3,
      productivity: 1,
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
    expect(detailsElement.innerHTML).toContain('6 W/m² solar flux');
  });
});
