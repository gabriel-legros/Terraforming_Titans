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
  ctx.formatStorageDetails = () => '';
  ctx.resources = { colony: { water: { displayName: 'Water' }, metal: { displayName: 'Metal' } } };
  ctx.terraforming = { celestialParameters: {} };
  ctx.Colony = class {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
})();

describe('build count scaling for production and consumption display', () => {
  test('production, consumption, and maintenance scale with build count', () => {
    const structure = {
      name: 'testStruct',
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      requiresMaintenance: true,
      maintenanceCost: { metal: 1 },
      getModifiedProduction: () => ({ colony: { water: 2 } }),
      getModifiedConsumption: () => ({ colony: { metal: 3 } }),
    };

    const sections = getProdConsSections(structure, 5);
    const production = sections.find(sec => sec.key === 'production').data;
    const consumption = sections.find(sec => sec.key === 'consumption').data;
    const maintenance = sections.find(sec => sec.key === 'maintenance').data;

    expect(production.colony.water).toBe(10);
    expect(consumption.colony.metal).toBe(15);
    expect(maintenance.metal).toBe(5);
  });
});
