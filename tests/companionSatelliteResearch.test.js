const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Companion Satellite research', () => {
  test('exists in advanced research with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'companion_satellite');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(225000);
    const effect = research.effects.find(e => e.target === 'researchManager' && e.targetId === 'ore_scanning' && e.type === 'completeResearch');
    expect(effect).toBeDefined();
  });
});
