const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Bosch Reactor research', () => {
  test('requires boschReactorUnlocked flag and unlocks the building', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);

    const terraformingResearch = ctx.researchParameters.terraforming;
    const research = terraformingResearch.find((entry) => entry.id === 'bosch_reactor');

    expect(research).toBeDefined();
    expect(research.cost.research).toBe(150000);
    expect(research.prerequisites).toEqual([]);
    expect(research.requiredFlags).toContain('boschReactorUnlocked');

    const buildingEffect = research.effects.find((effect) => (
      effect.target === 'building' &&
      effect.targetId === 'boschReactor' &&
      effect.type === 'enable'
    ));
    expect(buildingEffect).toBeDefined();
  });
});
