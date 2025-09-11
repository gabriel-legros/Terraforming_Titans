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

describe('maintenance line break display', () => {
  test('maintenance starts on new line without preceding comma when production and consumption exist', () => {
    const structure = {
      name: 'testStruct',
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      requiresMaintenance: true,
      maintenanceCost: { metal: 1 },
      getModifiedProduction: () => ({ colony: { water: 2 } }),
      getModifiedConsumption: () => ({ colony: { metal: 3 } })
    };
    const element = structuresUI.document.createElement('div');

    structuresUI.updateProductionConsumptionDetails(structure, element, 1);

    const br = element.querySelector('br');
    expect(br).not.toBeNull();
    expect(br.previousSibling.nodeType).toBe(1);
    expect(br.previousSibling.querySelector('strong').textContent).toBe('Consumption:');
    expect(br.nextSibling.querySelector('strong').textContent).toBe('Maintenance:');
  });
});
