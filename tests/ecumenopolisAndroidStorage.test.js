const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Ecumenopolis District storage', () => {
  test('provides 100M android storage', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'colony-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.colonyParameters = colonyParameters;', ctx);
    const params = ctx.colonyParameters;
    const t7 = params.t7_colony;
    expect(t7.storage.colony.androids).toBe(100000000);
  });
});
