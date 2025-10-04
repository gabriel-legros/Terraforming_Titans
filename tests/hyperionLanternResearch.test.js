const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Hyperion Lantern research', () => {
  test('exists in advanced research category with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'hyperion_lantern');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(10000);
    const enable = research.effects.find(e => e.target === 'building' && e.targetId === 'hyperionLantern');
    expect(enable).toBeDefined();
  });
});
