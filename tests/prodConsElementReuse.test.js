const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

const structuresUI = (() => {
  const dom = new JSDOM('<!DOCTYPE html><div></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.resources = { colony: { water: { displayName: 'Water' }, metal: { displayName: 'Metal' } } };
  ctx.formatNumber = n => n;
  ctx.terraforming = { celestialParameters: {} };
  ctx.Colony = class {};
  ctx.buildings = {};
  ctx.colonies = {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
})();

describe('buildProdConsElement reuse', () => {
  test('buildProdConsElement called only once and nodes remain attached', () => {
    const structure = {
      name: 'testStruct',
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      requiresMaintenance: true,
      maintenanceCost: { metal: 1 },
      getModifiedProduction: () => ({ colony: { water: 2 } }),
      getModifiedConsumption: () => ({ colony: { metal: 3 } }),
    };
    const element = structuresUI.document.createElement('div');

    let callCount = 0;
    const originalBuild = structuresUI.buildProdConsElement;
    structuresUI.buildProdConsElement = function(...args) {
      callCount++;
      return originalBuild.apply(this, args);
    };

    structuresUI.updateProductionConsumptionDetails(structure, element, 1);
    const firstSpan = element.querySelector('span');

    structuresUI.updateProductionConsumptionDetails(structure, element, 1);

    expect(callCount).toBe(1);
    expect(element.contains(firstSpan)).toBe(true);
  });
});
