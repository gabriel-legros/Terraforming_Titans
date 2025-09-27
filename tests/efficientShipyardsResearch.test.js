const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Efficient Shipyards research', () => {
  test('exists in industry research with proper cost and effects', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const industry = ctx.researchParameters.industry;
    const research = industry.find(r => r.id === 'efficient_shipyards');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(100000000000);
    const prod = research.effects.find(e => e.target === 'building' && e.targetId === 'shipyard' && e.type === 'productionMultiplier');
    expect(prod).toBeDefined();
    const cons = research.effects.find(e => e.target === 'building' && e.targetId === 'shipyard' && e.type === 'consumptionMultiplier');
    expect(cons).toBeDefined();
  });
});

