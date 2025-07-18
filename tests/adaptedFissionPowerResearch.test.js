const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Adapted fission power research', () => {
  test('exists in energy research with proper cost and effects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const energy = ctx.researchParameters.energy;
    const research = energy.find(r => r.id === 'fission_plant1_upgrade2');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(500000);
    const prod = research.effects.find(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'productionMultiplier');
    expect(prod).toBeDefined();
    const water = research.effects.find(e => e.target === 'building' && e.targetId === 'nuclearPowerPlant' && e.type === 'resourceConsumptionMultiplier');
    expect(water).toBeDefined();
  });
});
