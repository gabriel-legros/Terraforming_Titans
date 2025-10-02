const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Space Mirror Focusing advanced research', () => {
  test('exists in advanced category with correct cost and flag effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'space_mirror_focusing');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(80000);
    const flagEffect = research.effects.find(
      e =>
        e.target === 'project' &&
        e.targetId === 'spaceMirrorFacility' &&
        e.type === 'booleanFlag' &&
        e.flagId === 'spaceMirrorFocusing' &&
        e.value === true
    );
    expect(flagEffect).toBeDefined();
  });
});
