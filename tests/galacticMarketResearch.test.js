const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Galactic Market advanced research', () => {
  test('enables the market project and retires legacy exports', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);

    const advanced = ctx.researchParameters.advanced;
    const research = advanced.find(item => item.id === 'galactic_market');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(300000);

    const enableMarket = research.effects.find(effect => (
      effect.target === 'project' &&
      effect.targetId === 'galactic_market' &&
      effect.type === 'enable'
    ));
    expect(enableMarket).toBeDefined();

    const disableCargo = research.effects.find(effect => (
      effect.target === 'project' &&
      effect.targetId === 'cargo_rocket' &&
      effect.type === 'permanentProjectDisable'
    ));
    expect(disableCargo).toBeDefined();
    expect(disableCargo.value).toBe(true);

    const disableExport = research.effects.find(effect => (
      effect.target === 'project' &&
      effect.targetId === 'exportResources' &&
      effect.type === 'permanentProjectDisable'
    ));
    expect(disableExport).toBeDefined();
    expect(disableExport.value).toBe(true);
  });
});

