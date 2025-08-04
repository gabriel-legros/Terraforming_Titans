const fs = require('fs');
const path = require('path');
const vm = require('vm');

const buildingPath = path.join(__dirname, '..', 'src/js', 'buildings-parameters.js');
const code = fs.readFileSync(buildingPath, 'utf8');

describe('Cloning Facility building', () => {
  test('defined with energy consumption and colonist production', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const building = ctx.buildingsParameters.cloningFacility;
    expect(building).toBeDefined();
    expect(building.consumption.colony.energy).toBe(500000);
    expect(building.production.colony.colonists).toBe(0.1);
  });
});

