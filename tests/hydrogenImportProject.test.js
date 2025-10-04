const fs = require('fs');
const path = require('path');
const vm = require('vm');

const paramsPath = path.join(__dirname, '..', 'src/js', 'project-parameters.js');
const code = fs.readFileSync(paramsPath, 'utf8');

describe('Hydrogen Importation project', () => {
  test('mirrors nitrogen import settings for hydrogen', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.projectParameters = projectParameters;', ctx);
    const hydrogen = ctx.projectParameters.hydrogenSpaceMining;
    const nitrogen = ctx.projectParameters.nitrogenSpaceMining;

    expect(hydrogen).toBeDefined();
    expect(hydrogen.type).toBe('SpaceMiningProject');
    expect(hydrogen.unlocked).toBe(false);
    expect(hydrogen.duration).toBe(nitrogen.duration);
    expect(hydrogen.repeatable).toBe(true);
    expect(hydrogen.attributes.spaceMining).toBe(true);
    expect(hydrogen.attributes.maxPressure).toBe(nitrogen.attributes.maxPressure);
    expect(hydrogen.attributes.costPerShip.colony.metal)
      .toBe(nitrogen.attributes.costPerShip.colony.metal);
    expect(hydrogen.attributes.costPerShip.colony.energy)
      .toBe(nitrogen.attributes.costPerShip.colony.energy);
    expect(hydrogen.attributes.resourceGainPerShip.atmospheric)
      .toHaveProperty('hydrogen', 1000000);
    expect(nitrogen.attributes.resourceGainPerShip.atmospheric)
      .toHaveProperty('inertGas', 1000000);
  });
});
