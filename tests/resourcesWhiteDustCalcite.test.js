const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('New resources for reversal', () => {
  test('whiteDust and calciteAerosol exist in default planet parameters', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'planet-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.defaultPlanetParameters = defaultPlanetParameters;', ctx);

    const def = ctx.defaultPlanetParameters;
    expect(def).toBeDefined();
    expect(def.resources.special.whiteDust).toBeDefined();
    expect(def.resources.special.whiteDust.baseCap).toBeGreaterThan(0);
    expect(def.resources.atmospheric.calciteAerosol).toBeDefined();
    expect(def.resources.atmospheric.calciteAerosol.initialValue).toBe(0);
  });
});

