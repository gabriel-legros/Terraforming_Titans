const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Ship smelting advanced research', () => {
  test('exists in advanced research with correct cost and effect', () => {
    const ctx = {};
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research-parameters.js'), 'utf8');
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'ship_smelting');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(200000);
    const effect = research.effects.find(e => e.type === 'shipCapacityMultiplier' && e.target === 'project' && e.targetId === 'oreSpaceMining' && e.value === 2);
    expect(effect).toBeDefined();
  });
});
