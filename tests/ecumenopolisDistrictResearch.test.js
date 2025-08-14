const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Ecumenopolis District research', () => {
  test('exists with correct cost and effect', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const colonization = ctx.researchParameters.colonization;
    const research = colonization.find(r => r.id === 't7_colony');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(500000000000);
    expect(research.requiredFlags).toContain('superalloyResearchUnlocked');
    const colonyEffect = research.effects.find(e => e.target === 'colony' && e.targetId === 't7_colony' && e.type === 'enable');
    expect(colonyEffect).toBeDefined();
  });
});
