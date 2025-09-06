const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Mechanical Assistance research', () => {
  test('exists in advanced research with colony slider flag effect', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'mechanical_assistance');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(175000);
    const flag = research.effects.find(e => e.target === 'colonySliders' && e.type === 'booleanFlag' && e.flagId === 'mechanicalAssistance' && e.value === true);
    expect(flag).toBeDefined();
  });
});
