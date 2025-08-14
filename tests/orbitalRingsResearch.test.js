const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Orbital Rings research', () => {
  test('exists in advanced research with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'orbital_rings');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(150000);
    const effect = research.effects.find(e => e.target === 'researchManager' && e.type === 'booleanFlag' && e.flagId === 'orbitalRingsResearchUnlocked' && e.value === true);
    expect(effect).toBeDefined();
  });
});
