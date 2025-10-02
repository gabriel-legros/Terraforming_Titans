const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Next-Generation Fusion research', () => {
  test('exists with correct cost, flag, and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const energy = ctx.researchParameters.energy;
    const research = energy.find(r => r.id === 'next_generation_fusion');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(100000000000000);
    expect(research.requiredFlags).toContain('superalloyResearchUnlocked');
    const effect = research.effects.find(
      e => e.target === 'building' &&
        e.targetId === 'superalloyFusionReactor' &&
        e.type === 'productionMultiplier' &&
        e.value === 2
    );
    expect(effect).toBeDefined();
  });
});
