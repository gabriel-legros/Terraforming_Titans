const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Space Storage research', () => {
  test('exists in advanced research with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'space_storage');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(30000);
    const effect = research.effects.find(e => e.target === 'project' && e.targetId === 'spaceStorage' && e.type === 'enable');
    expect(effect).toBeDefined();
  });
});
