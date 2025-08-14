const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Superalloy Fusion Reactor research', () => {
  test('exists with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const energy = ctx.researchParameters.energy;
    const research = energy.find(r => r.id === 'superalloy_fusion_reactor');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(500000000000);
    expect(research.requiredFlags).toContain('superalloyResearchUnlocked');
    const buildingEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'superalloyFusionReactor' && e.type === 'enable');
    expect(buildingEffect).toBeDefined();
  });
});
