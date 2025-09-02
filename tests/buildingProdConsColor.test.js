const fs = require('fs');
const path = require('path');
const vm = require('vm');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);

// load structuresUI.js within a jsdom context
const structuresUI = (() => {
  const dom = new JSDOM('<!DOCTYPE html><div></div>', { runScripts: 'outside-only' });
  const ctx = dom.getInternalVMContext();
  ctx.formatNumber = n => n;
  ctx.formatStorageDetails = () => '';
  ctx.resources = {
    colony: {
      water: { displayName: 'Water', productionRate: 1, consumptionRate: 2 },
      metal: { displayName: 'Metal', productionRate: 5, consumptionRate: 2 }
    }
  };
  ctx.terraforming = { celestialParameters: {} };
  ctx.Colony = class {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'structuresUI.js'), 'utf8');
  vm.runInContext(code, ctx);
  return ctx;
})();

describe('production/consumption color coding', () => {
  test('negative net production turns green and projected negative consumption turns red', () => {
    const structure = {
      name: 'testStruct',
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      requiresMaintenance: false,
      maintenanceCost: {},
      getModifiedProduction: () => ({ colony: { water: 1 } }),
      getModifiedConsumption: () => ({ colony: { metal: 2 } }),
    };

    const element = structuresUI.document.createElement('div');

    // buildCount 1: metal remains positive, water negative
    structuresUI.updateProductionConsumptionDetails(structure, element, 1);
    const waterSpan = element._sections.production.spans.get('colony.water');
    const metalSpan = element._sections.consumption.spans.get('colony.metal');
    expect(waterSpan.style.color).toBe('green');
    expect(metalSpan.style.color).toBe('');

    // buildCount 2: metal would go negative
    structuresUI.updateProductionConsumptionDetails(structure, element, 2);
    expect(metalSpan.style.color).toBe('red');
  });

  test('consumption and maintenance combine to show deficit in red', () => {
    const structure = {
      name: 'consMaint',
      getModifiedStorage: () => ({}),
      powerPerBuilding: null,
      requiresMaintenance: true,
      maintenanceCost: { metal: 3 },
      getModifiedProduction: () => ({}),
      getModifiedConsumption: () => ({ colony: { metal: 2 } }),
    };

    const element = structuresUI.document.createElement('div');
    structuresUI.resources.colony.metal.productionRate = 6;
    structuresUI.resources.colony.metal.consumptionRate = 2; // net 4

    structuresUI.updateProductionConsumptionDetails(structure, element, 1);
    const consSpan = element._sections.consumption.spans.get('colony.metal');
    const maintSpan = element._sections.maintenance.spans.get('colony.metal');
    expect(consSpan.style.color).toBe('red');
    expect(maintSpan.style.color).toBe('red');
  });
});

