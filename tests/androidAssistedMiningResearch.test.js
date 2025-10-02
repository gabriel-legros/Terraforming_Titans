const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Android-assisted deeper mining research', () => {
  test('exists in industry category with correct cost and flag effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const industry = ctx.researchParameters.industry;
    const research = industry.find(r => r.id === 'android_assisted_mining');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(2000000);
    const flagEffect = research.effects.find(e =>
      e.target === 'project' &&
      e.targetId === 'deeperMining' &&
      e.type === 'booleanFlag' &&
      e.flagId === 'androidAssist' &&
      e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
