const fs = require('fs');
const path = require('path');
const vm = require('vm');

const buildingPath = path.join(__dirname, '..', 'src/js', 'buildings-parameters.js');
const code = fs.readFileSync(buildingPath, 'utf8');

describe('Hyperion Lantern building', () => {
  test('defined with correct cost and power', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const building = ctx.buildingsParameters.hyperionLantern;
    expect(building).toBeDefined();
    expect(building.category).toBe('terraforming');
    expect(building.cost.colony.components).toBe(1e6);
    expect(building.cost.colony.electronics).toBe(1e6);
    expect(building.cost.colony.metal).toBe(1e6);
    expect(building.cost.colony.glass).toBe(1e6);
    expect(building.powerPerBuilding).toBe(1e12);
  });
});
