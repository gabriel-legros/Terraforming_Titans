const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Mega Particle Accelerator research', () => {
  test('exists in advanced research with correct cost and unlock effect', () => {
    const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
    const code = fs.readFileSync(researchPath, 'utf8');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);

    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(item => item.id === 'mega_particle_accelerator');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(250000);
    expect(research.description).toBe('Unlocks a new megastructure that can assist in boosting advanced research gains.');
    const effect = research.effects.find(effect => effect.target === 'project' && effect.targetId === 'particleAccelerator' && effect.type === 'enable');
    expect(effect).toBeDefined();
  });
});
