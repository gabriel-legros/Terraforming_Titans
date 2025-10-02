const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Cloning Facilities research', () => {
  test('exists with correct cost, requirement and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const colonization = ctx.researchParameters.colonization;
    const research = colonization.find(r => r.id === 'cloning_facilities');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(1000);
    expect(research.requiredFlags).toContain('cloningResearchUnlocked');
    const effect = research.effects.find(
      e => e.target === 'building' && e.targetId === 'cloningFacility' && e.type === 'enable'
    );
    expect(effect).toBeDefined();
  });
});

