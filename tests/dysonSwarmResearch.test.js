const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Dyson Swarm research parameters', () => {
  test('advanced research sets unlock flag', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'dyson_swarm_concept');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(25000);
    const flagEffect = research.effects.find(e => e.type === 'booleanFlag' && e.flagId === 'dysonSwarmUnlocked' && e.value === true);
    expect(flagEffect).toBeDefined();
  });

  test('energy research requires unlock flag', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'research-parameters.js'), 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const energy = ctx.researchParameters.energy;
    const research = energy.find(r => r.id === 'dyson_swarm_receiver');
    expect(research).toBeDefined();
    expect(research.cost.research).toBe(100000);
    expect(research.requiredFlags).toEqual(['dysonSwarmUnlocked']);
    const effect = research.effects.find(e => e.target === 'project' && e.targetId === 'dysonSwarmReceiver');
    expect(effect).toBeDefined();
  });
});
