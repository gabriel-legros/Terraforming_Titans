const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Modular Nuclear Reactor research', () => {
  test('exists in advanced research with correct cost and effects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(r => r.id === 'modular_nuclear_reactor');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(1000);
    const completeEffect = research.effects.find(e => e.target === 'researchManager' && e.type === 'completeResearch');
    expect(completeEffect).toBeDefined();
    const enableEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'enable');
    expect(enableEffect).toBeDefined();
    const prodEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'productionMultiplier');
    expect(prodEffect).toBeDefined();
    const consEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'consumptionMultiplier');
    expect(consEffect).toBeDefined();
    const costEffects = research.effects.filter(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'resourceCostMultiplier');
    expect(costEffects).toHaveLength(3);
  });
});
