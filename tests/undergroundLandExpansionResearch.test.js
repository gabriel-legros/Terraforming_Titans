const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Underground Land Expansion research', () => {
  test('exists with correct cost and effects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const industry = ctx.researchParameters.industry;
    const research = industry.find(r => r.id === 'underground_land_expansion');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(2000000);
    expect(research.prerequisites).toContain('android_factory');
    expect(research.requiredFlags).toContain('undergroundHabitatsResearchUnlocked');
    const enableEffect = research.effects.find(e =>
      e.target === 'project' && e.targetId === 'undergroundExpansion' && e.type === 'enable' && e.value === true
    );
    expect(enableEffect).toBeDefined();
    const flagEffect = research.effects.find(e =>
      e.target === 'project' && e.targetId === 'undergroundExpansion' && e.type === 'booleanFlag' && e.flagId === 'androidAssist' && e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
