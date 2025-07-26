const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Hive Mind Androids research', () => {
  test('exists in advanced research with flag effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'hive_mind_androids');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(75000);
    const flag = research.effects.find(e => e.type === 'booleanFlag' && e.flagId === 'hiveMindAndroids' && e.target === 'global' && e.value === true);
    expect(flag).toBeDefined();
  });
});
