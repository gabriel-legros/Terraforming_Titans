const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

// load getProdConsSections from structuresUI.js within a jsdom context
const { getProdConsSections } = (() => {
  const dom = new JSDOM('<!DOCTYPE html><div></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.formatNumber = n => n;
  ctx.formatStorageDetails = storage => `${storage.colony.water} Water`;
  ctx.resources = { colony: { water: { displayName: 'Water', unlocked: true } } };
  ctx.terraforming = { celestialParameters: {} };
  ctx.Colony = class {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
})();

describe('storage provides scaling with build count', () => {
  test('storage values scale according to build count', () => {
    const structure = {
      name: 'testStruct',
      getModifiedStorage: () => ({ colony: { water: 2 } }),
      powerPerBuilding: null,
      requiresMaintenance: false,
      maintenanceCost: {},
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({})
    };

    const sections = getProdConsSections(structure, 5);
    const provides = sections.find(sec => sec.key === 'provides').data;
    expect(provides[0]).toBe('10 Water');
  });
});
