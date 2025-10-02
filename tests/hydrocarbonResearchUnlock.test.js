const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('hydrocarbon advanced research', () => {
  test('sets unlock flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'hydrocarbon_research');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(1000);
    const flagEffect = research.effects.find(e => e.type === 'booleanFlag' && e.flagId === 'hydrocarbonResearchUnlocked' && e.value === true);
    expect(flagEffect).toBeDefined();
  });
});
