const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Nanotechnology Stage I advanced research', () => {
  test('exists with correct cost and flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'nanotechnology_stage_1');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(125000);
    const flag = research.effects.find(
      e => e.type === 'booleanFlag' && e.flagId === 'nanotechnologyStage1' && e.target === 'researchManager' && e.value === true
    );
    expect(flag).toBeDefined();
  });
});
