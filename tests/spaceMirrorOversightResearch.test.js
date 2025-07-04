const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Space Mirror Facility Oversight research', () => {
  test('exists in colonization category with correct cost and flag effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const colonization = ctx.researchParameters.colonization;
    const research = colonization.find(r => r.id === 'space_mirror_oversight');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(2000000);
    const flagEffect = research.effects.find(
      e =>
        e.target === 'project' &&
        e.targetId === 'spaceMirrorFacility' &&
        e.type === 'booleanFlag' &&
        e.flagId === 'spaceMirrorFacilityOversight' &&
        e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
