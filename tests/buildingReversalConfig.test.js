const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Building reversal config', () => {
  test('dustFactory and ghgFactory define reversal wiring', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);

    const dust = ctx.buildingsParameters.dustFactory;
    expect(dust).toBeDefined();
    expect(dust.reversalAvailable).toBe(false);
    expect(dust.recipes).toBeDefined();
    expect(dust.recipes.black.production.special.albedoUpgrades).toBeGreaterThan(0);
    expect(dust.recipes.white.production.special.whiteDust).toBeGreaterThan(0);

    const ghg = ctx.buildingsParameters.ghgFactory;
    expect(ghg).toBeDefined();
    expect(ghg.reversalAvailable).toBe(false);
    expect(ghg.recipes).toBeDefined();
    expect(ghg.recipes.ghg.production.atmospheric.greenhouseGas).toBeGreaterThan(0);
    expect(ghg.recipes.calcite.production.atmospheric.calciteAerosol).toBeGreaterThan(0);
  });
});

