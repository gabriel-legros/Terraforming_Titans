const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Superalloys advanced research', () => {
  test('exists with correct cost and flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'super_alloys');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(100000);
    const flagEffect = research.effects.find(
      e => e.type === 'booleanFlag' && e.flagId === 'superalloyResearchUnlocked' && e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
