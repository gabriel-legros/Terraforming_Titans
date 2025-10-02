const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');

const buildingPath = path.join(__dirname, '..', 'src/js', 'buildings-parameters.js');
const code = fs.readFileSync(buildingPath, 'utf8');

describe('geothermal generator maintenance', () => {
  beforeEach(() => {
    global.maintenanceFraction = 0.1;
  });

  test('has reduced maintenance cost', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const building = new Building(ctx.buildingsParameters.geothermalGenerator, 'geothermalGenerator');
    const maintenance = building.calculateMaintenanceCost();
    expect(maintenance.metal).toBeCloseTo(5);
    expect(maintenance.components).toBeCloseTo(1);
  });
});


