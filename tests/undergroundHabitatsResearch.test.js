const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Underground habitats advanced research', () => {
  test('exists with correct cost and flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'underground_habitats');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(50000);
    const flagEffect = research.effects.find(
      e => e.type === 'booleanFlag' && e.flagId === 'undergroundHabitatsResearchUnlocked' && e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
