const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Oxygen Factory electrolysis outputs', () => {
  function loadOxygenFactoryParameters() {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    return ctx.buildingsParameters.oxygenFactory;
  }

  test('produces hydrogen alongside oxygen', () => {
    const oxygenFactory = loadOxygenFactoryParameters();
    const atmospheric = oxygenFactory.production.atmospheric;

    expect(atmospheric).toHaveProperty('oxygen');
    expect(atmospheric).toHaveProperty('hydrogen');
    expect(atmospheric.oxygen).toBeCloseTo(88.89, 2);
    expect(atmospheric.hydrogen).toBeCloseTo(11.11, 2);
  });

  test('maintains mass balance between input water and output gases', () => {
    const oxygenFactory = loadOxygenFactoryParameters();
    const waterConsumption = oxygenFactory.consumption.colony.water;
    const atmospheric = oxygenFactory.production.atmospheric;
    const totalGasOutput = atmospheric.oxygen + atmospheric.hydrogen;

    expect(totalGasOutput).toBeCloseTo(waterConsumption, 2);
  });
});
