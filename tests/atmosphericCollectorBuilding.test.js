const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Atmospheric Water Collector building', () => {
  test('defined with correct parameters', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const b = ctx.buildingsParameters.atmosphericWaterCollector;
    expect(b).toBeDefined();
    expect(b.cost.colony.components).toBe(10);
    expect(b.cost.colony.electronics).toBe(1);
    expect(b.production.colony.water).toBe(1);
    expect(b.consumption.atmospheric.atmosphericWater).toBe(1);
  });
});
