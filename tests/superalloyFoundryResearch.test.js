const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Superalloy Foundry research', () => {
  test('exists with correct cost and effects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const industry = ctx.researchParameters.industry;
    const research = industry.find(r => r.id === 'superalloy_foundry');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(500000000000);
    expect(research.requiredFlags).toContain('superalloyResearchUnlocked');
    const buildingEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'superalloyFoundry' && e.type === 'enable');
    const resourceEffect = research.effects.find(e => e.target === 'resource' && e.targetId === 'superalloys' && e.type === 'enable');
    expect(buildingEffect).toBeDefined();
    expect(resourceEffect).toBeDefined();
  });
});
