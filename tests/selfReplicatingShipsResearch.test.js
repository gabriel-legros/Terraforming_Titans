const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Self Replicating Ships research', () => {
  test('advanced research sets unlock flag', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'self_replicating_ships_concept');
    expect(research).toBeDefined();
    const flag = research.effects.find(e => e.type === 'booleanFlag' && e.flagId === 'selfReplicatingShipsUnlocked' && e.value === true);
    expect(flag).toBeDefined();
  });

  test('industry research requires flag and enables replication', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const industry = ctx.researchParameters.industry;
    const research = industry.find(r => r.id === 'self_replicating_ships');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(10000000000);
    expect(research.requiredFlags).toEqual(['selfReplicatingShipsUnlocked']);
    const flag = research.effects.find(e => e.type === 'booleanFlag' && e.flagId === 'selfReplicatingShips' && e.target === 'global' && e.value === true);
    expect(flag).toBeDefined();
  });
});
