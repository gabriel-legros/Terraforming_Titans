const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Mass Driver research', () => {
  test('requires massDriverUnlocked flag and enables mass driver integration', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);

    const terraformingResearch = ctx.researchParameters.terraforming;
    const research = terraformingResearch.find(entry => entry.id === 'mass_driver');

    expect(research).toBeDefined();
    expect(research.cost.research).toBe(5000000);
    expect(research.prerequisites).not.toContain('water_electrolysis');
    expect(research.requiredFlags).toContain('massDriverUnlocked');

    const buildingEffect = research.effects.find(effect =>
      effect.target === 'building' &&
      effect.targetId === 'massDriver' &&
      effect.type === 'enable'
    );
    expect(buildingEffect).toBeDefined();

    const flagEffect = research.effects.find(effect =>
      effect.target === 'project' &&
      effect.targetId === 'disposeResources' &&
      effect.type === 'booleanFlag' &&
      effect.flagId === 'massDriverEnabled' &&
      effect.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
