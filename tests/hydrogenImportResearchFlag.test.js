const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Hydrogen Importation research visibility', () => {
  test('requires the importHydrogenUnlocked flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const terraforming = ctx.researchParameters.terraforming;
    const research = terraforming.find(r => r.id === 'hydrogenImport');

    expect(research).toBeDefined();
    expect(research.requiredFlags).toContain('importHydrogenUnlocked');
  });
});
