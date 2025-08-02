const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Biodome land cost', () => {
  test('Biodome requires 100 land', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'buildings-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.buildingsParameters = buildingsParameters;', ctx);
    const b = ctx.buildingsParameters.biodome;
    expect(b.requiresLand).toBe(100);
  });
});
